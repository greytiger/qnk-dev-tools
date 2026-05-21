// Tab Navigation
const navItems = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Deactivate all nav items & panels
        navItems.forEach(nav => nav.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));

        // Activate current selection
        item.classList.add('active');
        const targetTab = item.getAttribute('data-tab');
        document.getElementById(targetTab).classList.add('active');
    });
});

// ----------------------------------------------------
// TOOL 1: Properties ↔ YAML
// ----------------------------------------------------
function convertPropertiesToYaml() {
    const propText = document.getElementById('prop-input').value;
    const lines = propText.split('\n');
    const root = {};
    
    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
        
        const splitIdx = trimmed.indexOf('=') !== -1 ? trimmed.indexOf('=') : trimmed.indexOf(':');
        if (splitIdx === -1) continue;
        
        const key = trimmed.substring(0, splitIdx).trim();
        const val = trimmed.substring(splitIdx + 1).trim();
        
        const parts = key.split('.');
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                current[part] = val;
            } else {
                if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part];
            }
        }
    }
    
    function objToYaml(obj, depth = 0) {
        const indent = '  '.repeat(depth);
        let yaml = '';
        for (let key in obj) {
            const val = obj[key];
            if (typeof val === 'object' && val !== null) {
                yaml += `${indent}${key}:\n${objToYaml(val, depth + 1)}`;
            } else {
                yaml += `${indent}${key}: ${val}\n`;
            }
        }
        return yaml;
    }
    
    document.getElementById('yaml-input').value = objToYaml(root);
}

function convertYamlToProperties() {
    const yamlText = document.getElementById('yaml-input').value;
    const lines = yamlText.split('\n');
    const result = [];
    const stack = []; // holds { indent, key }
    
    for (let line of lines) {
        // Strip inline comment
        const commentIdx = line.indexOf('#');
        let cleanLine = line;
        if (commentIdx !== -1) {
            if (line.trim().startsWith('#')) {
                result.push(line.trim());
                continue;
            }
            cleanLine = line.substring(0, commentIdx);
        }
        
        const trimmed = cleanLine.trim();
        if (!trimmed) continue;
        
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;
        
        const key = trimmed.substring(0, colonIdx).trim();
        let val = trimmed.substring(colonIdx + 1).trim();
        
        const indent = line.length - line.trimStart().length;
        
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }
        
        stack.push({ indent, key });
        
        if (val) {
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            const fullKey = stack.map(s => s.key).join('.');
            result.push(`${fullKey}=${val}`);
        }
    }
    
    document.getElementById('prop-input').value = result.join('\n');
}

// ----------------------------------------------------
// TOOL 2: JSON to POJO Generator
// ----------------------------------------------------
function generateJavaPojos() {
    const jsonText = document.getElementById('json-input').value;
    const className = document.getElementById('pojo-class-name').value.trim() || 'RootClass';
    const style = document.getElementById('pojo-style').value;
    
    let data;
    try {
        data = JSON.parse(jsonText);
    } catch (e) {
        document.getElementById('pojo-output').value = "Lỗi: JSON không đúng định dạng!\n" + e.message;
        return;
    }
    
    const extraClasses = [];
    
    function capitalize(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    function toCamelCase(str) {
        return str.replace(/([-_][a-z])/g, group =>
            group.toUpperCase().replace('-', '').replace('_', '')
        );
    }
    
    function getType(val, keyName) {
        if (val === null) return "Object";
        if (typeof val === "boolean") return "Boolean";
        if (typeof val === "number") {
            return Number.isInteger(val) ? "Integer" : "Double";
        }
        if (typeof val === "string") return "String";
        if (Array.isArray(val)) {
            if (val.length === 0) return "List<Object>";
            const elementType = getType(val[0], keyName);
            return `List<${elementType}>`;
        }
        if (typeof val === "object") {
            const subClassName = capitalize(toCamelCase(keyName));
            buildClass(val, subClassName);
            return subClassName;
        }
        return "Object";
    }
    
    function buildClass(obj, cName) {
        const fields = [];
        for (let key in obj) {
            const camelKey = toCamelCase(key);
            const type = getType(obj[key], key);
            fields.push({ originalKey: key, camelKey, type });
        }
        
        let classStr = "";
        if (style === "lombok") {
            classStr += `@Data\n@NoArgsConstructor\n@AllArgsConstructor\npublic class ${cName} {\n`;
            fields.forEach(f => {
                if (f.originalKey !== f.camelKey) {
                    classStr += `    @JsonProperty("${f.originalKey}")\n`;
                }
                classStr += `    private ${f.type} ${f.camelKey};\n`;
            });
            classStr += `}`;
        } else if (style === "record") {
            classStr += `public record ${cName}(\n`;
            const params = fields.map(f => {
                let annotation = f.originalKey !== f.camelKey ? `@JsonProperty("${f.originalKey}") ` : "";
                return `    ${annotation}${f.type} ${f.camelKey}`;
            }).join(',\n');
            classStr += params + "\n) {}";
        } else {
            classStr += `public class ${cName} {\n`;
            fields.forEach(f => {
                if (f.originalKey !== f.camelKey) {
                    classStr += `    @JsonProperty("${f.originalKey}")\n`;
                }
                classStr += `    private ${f.type} ${f.camelKey};\n`;
            });
            classStr += `\n`;
            fields.forEach(f => {
                const capKey = capitalize(f.camelKey);
                classStr += `    public ${f.type} get${capKey}() {\n        return ${f.camelKey};\n    }\n\n`;
                classStr += `    public void set${capKey}(${f.type} ${f.camelKey}) {\n        this.${f.camelKey} = ${f.camelKey};\n    }\n\n`;
            });
            classStr += `}`;
        }
        extraClasses.push(classStr);
    }
    
    if (Array.isArray(data)) {
        if (data.length > 0) {
            buildClass(data[0], className);
        } else {
            document.getElementById('pojo-output').value = "// Mảng JSON rỗng. Không thể suy luận các kiểu dữ liệu.";
            return;
        }
    } else {
        buildClass(data, className);
    }
    
    document.getElementById('pojo-output').value = extraClasses.reverse().join('\n\n');
}

// ----------------------------------------------------
// TOOL 3: JVM Memory & GC Recommendation
// ----------------------------------------------------
function runJvmCalculator() {
    const ramInput = document.getElementById('jvm-ram-input').value;
    const profile = document.getElementById('jvm-profile').value;
    
    const ram = parseInt(ramInput);
    if (isNaN(ram) || ram <= 0) {
        document.getElementById('jvm-output').value = "# Vui lòng nhập thông số RAM Container hợp lệ.";
        return;
    }
    
    let heapRatio = 0.70;
    if (profile === 'microservice') heapRatio = 0.60;
    else if (profile === 'batch') heapRatio = 0.75;
    
    const heapSize = Math.floor(ram * heapRatio);
    const metaspace = Math.min(Math.floor(ram * 0.15), 512);
    const offheap = ram - heapSize - metaspace;
    
    document.getElementById('metric-heap').textContent = `${heapSize} MB`;
    document.getElementById('metric-heap-percent').textContent = `${Math.floor(heapRatio * 100)}% của RAM Container`;
    document.getElementById('metric-metaspace').textContent = `${metaspace} MB`;
    document.getElementById('metric-offheap').textContent = `${offheap} MB`;
    
    let gcFlag = "";
    let gcExplain = "";
    if (ram < 2048) {
        gcFlag = "-XX:+UseParallelGC";
        gcExplain = "Sử dụng Parallel GC tối ưu độ trễ thấp & sử dụng RAM nhỏ gọn.";
    } else {
        gcFlag = "-XX:+UseG1GC -XX:MaxGCPauseMillis=200";
        gcExplain = "Sử dụng G1 Garbage Collector cân bằng tốt giữa throughput và latency.";
    }
    
    const flags = [
        `# ========================================================`,
        `# THÔNG SỐ JVM KHUYẾN NGHỊ CHO CONTAINER ${ram}MB (Profile: ${profile.toUpperCase()})`,
        `# ========================================================`,
        `# Thiết lập dung lượng Heap kích hoạt cố định (Xms = Xmx)`,
        `-Xms${heapSize}m`,
        `-Xmx${heapSize}m`,
        ``,
        `# Giới hạn Metaspace ngăn việc tải quá nhiều Class rò rỉ bộ nhớ`,
        `-XX:MetaspaceSize=128m`,
        `-XX:MaxMetaspaceSize=${metaspace}m`,
        ``,
        `# Bộ dọn rác (${gcExplain})`,
        gcFlag,
        ``,
        `# Cấu hình container đảm bảo thoát và hồi phục Pod trong Kubernetes`,
        `-XX:+ExitOnOutOfMemoryError`,
        `-XX:+HeapDumpOnOutOfMemoryError`,
        `-XX:HeapDumpPath=/tmp/heapdump.hprof`,
        ``,
        `# Tối ưu hóa chuỗi trùng lặp để tiết kiệm dung lượng Heap`,
        `-XX:+UseStringDeduplication`,
        `-Dfile.encoding=UTF-8`
    ].join('\n');
    
    document.getElementById('jvm-output').value = flags;
}

// Initialize Calculator on startup
runJvmCalculator();

// ----------------------------------------------------
// TOOL 4: Cron Expression Maker & Parser
// ----------------------------------------------------
function updateCronFromInputs() {
    const sec = document.getElementById('cron-sec').value.trim() || '*';
    const min = document.getElementById('cron-min').value.trim() || '*';
    const hour = document.getElementById('cron-hour').value.trim() || '*';
    const dom = document.getElementById('cron-dom').value.trim() || '*';
    const month = document.getElementById('cron-month').value.trim() || '*';
    const dow = document.getElementById('cron-dow').value.trim() || '?';
    
    const cronExpression = `${sec} ${min} ${hour} ${dom} ${month} ${dow}`;
    document.getElementById('cron-result-string').textContent = cronExpression;
    document.getElementById('cron-code-annotation').textContent = cronExpression;
    
    document.getElementById('cron-result-explanation').textContent = explainSpringCron(cronExpression);
}

function applyCronPreset() {
    const presetVal = document.getElementById('cron-presets').value;
    if (!presetVal) return;
    
    const fields = presetVal.split(' ');
    if (fields.length !== 6) return;
    
    document.getElementById('cron-sec').value = fields[0];
    document.getElementById('cron-min').value = fields[1];
    document.getElementById('cron-hour').value = fields[2];
    document.getElementById('cron-dom').value = fields[3];
    document.getElementById('cron-month').value = fields[4];
    document.getElementById('cron-dow').value = fields[5];
    
    updateCronFromInputs();
}

function explainSpringCron(cronStr) {
    const fields = cronStr.trim().split(/\s+/);
    if (fields.length !== 6) {
        return "Cấu trúc biểu thức Cron Spring Boot không hợp lệ. Phải có đúng 6 phần tử.";
    }
    
    const [sec, min, hour, dom, month, dow] = fields;
    
    function parseField(field, unitName, valMap = null) {
        if (field === '*' || field === '?') return `mỗi ${unitName}`;
        if (field.includes('/')) {
            const [start, step] = field.split('/');
            if (start === '*' || start === '0') {
                return `mỗi ${step} ${unitName}`;
            }
            return `mỗi ${step} ${unitName} bắt đầu từ ${unitName} thứ ${start}`;
        }
        if (field.includes('-')) {
            const [start, end] = field.split('-');
            const startVal = valMap ? (valMap[start] || start) : start;
            const endVal = valMap ? (valMap[end] || end) : end;
            return `từ ${unitName} ${startVal} đến ${endVal}`;
        }
        if (field.includes(',')) {
            const parts = field.split(',').map(p => valMap ? (valMap[p] || p) : p);
            return `vào các ${unitName}: ${parts.join(', ')}`;
        }
        return `${unitName} ${valMap ? (valMap[field] || field) : field}`;
    }
    
    const dowMap = {
        "1": "Chủ nhật", "2": "Thứ 2", "3": "Thứ 3", "4": "Thứ 4", "5": "Thứ 5", "6": "Thứ 6", "7": "Thứ 7",
        "SUN": "Chủ nhật", "MON": "Thứ 2", "TUE": "Thứ 3", "WED": "Thứ 4", "THU": "Thứ 5", "FRI": "Thứ 6", "SAT": "Thứ 7"
    };
    
    const monthMap = {
        "1": "Tháng 1", "2": "Tháng 2", "3": "Tháng 3", "4": "Tháng 4", "5": "Tháng 5", "6": "Tháng 6",
        "7": "Tháng 7", "8": "Tháng 8", "9": "Tháng 9", "10": "Tháng 10", "11": "Tháng 11", "12": "Tháng 12",
        "JAN": "Tháng 1", "FEB": "Tháng 2", "MAR": "Tháng 3", "APR": "Tháng 4", "MAY": "Tháng 5", "JUN": "Tháng 6",
        "JUL": "Tháng 7", "AUG": "Tháng 8", "SEP": "Tháng 9", "OCT": "Tháng 10", "NOV": "Tháng 11", "DEC": "Tháng 12"
    };
    
    let secDesc = parseField(sec, "giây");
    let minDesc = parseField(min, "phút");
    let hourDesc = parseField(hour, "giờ");
    let domDesc = parseField(dom, "ngày");
    let monthDesc = parseField(month, "tháng", monthMap);
    let dowDesc = parseField(dow, "thứ", dowMap);
    
    if (sec === '0' && min === '0' && !hour.includes('/') && !hour.includes(',') && !hour.includes('-') && hour !== '*') {
        const hh = hour.padStart(2, '0');
        return `Chạy định kỳ lúc ${hh}:00:00 mỗi ngày (${domDesc === 'mỗi ngày' ? '' : domDesc + ', '} ${dowDesc === 'mỗi thứ' ? '' : dowDesc + ', '} ${monthDesc === 'mỗi tháng' ? '' : monthDesc}).`;
    }
    
    if (sec === '0' && !min.includes('/') && !min.includes(',') && !min.includes('-') && min !== '*' && !hour.includes('/') && !hour.includes(',') && !hour.includes('-') && hour !== '*') {
        const hh = hour.padStart(2, '0');
        const mm = min.padStart(2, '0');
        return `Chạy định kỳ lúc ${hh}:${mm}:00 hàng ngày (${domDesc === 'mỗi ngày' ? '' : domDesc + ', '} ${dowDesc === 'mỗi thứ' ? '' : dowDesc + ', '} ${monthDesc === 'mỗi tháng' ? '' : monthDesc}).`;
    }
    
    return `Chạy vào: Giây ${secDesc}, Phút ${minDesc}, Giờ ${hourDesc}, ${domDesc === 'mỗi ngày' ? 'Hàng ngày' : domDesc}, ${monthDesc === 'mỗi tháng' ? 'Hàng tháng' : monthDesc}, ${dowDesc === 'mỗi thứ' ? 'Hàng tuần' : dowDesc}.`;
}

// Initialize Cron tool on startup
updateCronFromInputs();

// ----------------------------------------------------
// TOOL 5: JWT Decoder & Security Utilities
// ----------------------------------------------------
function decodeJwt() {
    const token = document.getElementById('jwt-input').value.trim();
    if (!token) {
        document.getElementById('jwt-header-out').textContent = '{}';
        document.getElementById('jwt-payload-out').textContent = '{}';
        return;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
        document.getElementById('jwt-header-out').textContent = 'Lỗi: Token JWT phải gồm 3 phần phân tách bởi dấu chấm (.)';
        document.getElementById('jwt-payload-out').textContent = 'Lỗi: Cấu trúc token không đúng.';
        return;
    }
    
    try {
        const headerDecoded = base64UrlDecode(parts[0]);
        const payloadDecoded = base64UrlDecode(parts[1]);
        
        document.getElementById('jwt-header-out').textContent = JSON.stringify(JSON.parse(headerDecoded), null, 2);
        document.getElementById('jwt-payload-out').textContent = JSON.stringify(JSON.parse(payloadDecoded), null, 2);
    } catch (e) {
        document.getElementById('jwt-header-out').textContent = 'Lỗi: Không thể giải mã dữ liệu base64.';
        document.getElementById('jwt-payload-out').textContent = e.message;
    }
}

function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// Base64 UTF-8 Encoding/Decoding
function runBase64Encode() {
    const plain = document.getElementById('base64-plain').value;
    if (!plain) {
        document.getElementById('base64-encoded').value = '';
        return;
    }
    try {
        const encoded = btoa(encodeURIComponent(plain).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
        document.getElementById('base64-encoded').value = encoded;
    } catch (e) {
        document.getElementById('base64-encoded').value = 'Lỗi mã hóa: ' + e.message;
    }
}

function runBase64Decode() {
    const encoded = document.getElementById('base64-encoded').value.trim();
    if (!encoded) {
        document.getElementById('base64-plain').value = '';
        return;
    }
    try {
        const decoded = decodeURIComponent(atob(encoded).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        document.getElementById('base64-plain').value = decoded;
    } catch (e) {
        document.getElementById('base64-plain').value = 'Lỗi giải mã: ' + e.message;
    }
}

// Basic Authentication Builder
function runBasicAuthBuilder() {
    const user = document.getElementById('basic-user').value;
    const pass = document.getElementById('basic-pass').value;
    
    const rawString = `${user}:${pass}`;
    const encoded = btoa(encodeURIComponent(rawString).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
    
    document.getElementById('basic-header-out').value = `Authorization: Basic ${encoded}`;
}

// Init Basic Auth on startup
runBasicAuthBuilder();

// ----------------------------------------------------
// UTILITY: Copy to Clipboard Function with Success State
// ----------------------------------------------------
function copyText(elementId, isTextContent = false) {
    const element = document.getElementById(elementId);
    let textToCopy = '';
    
    if (isTextContent) {
        textToCopy = element.textContent;
    } else {
        textToCopy = element.value;
    }
    
    if (!textToCopy) return;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const copyIcon = document.getElementById(`icon-copy-${elementId}`);
        if (copyIcon) {
            const originalPath = copyIcon.innerHTML;
            // Switch to success checkmark SVG path
            copyIcon.innerHTML = `<path class="success-checkmark" d="M20 6L9 17 4 12" />`;
            copyIcon.style.stroke = 'var(--color-success)';
            
            setTimeout(() => {
                copyIcon.innerHTML = originalPath;
                copyIcon.style.stroke = 'currentColor';
            }, 2000);
        }
    }).catch(err => {
        console.error('Không thể sao chép văn bản: ', err);
    });
}
