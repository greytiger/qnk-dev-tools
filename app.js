// Tab Navigation & Hash-based Router
const navItems = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const navMenu = document.querySelector('.nav-menu');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');

function switchTab(tabId) {
    const targetItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const targetPanel = document.getElementById(tabId);
    
    if (!targetItem || !targetPanel) return false;
    
    // Deactivate all nav items & panels
    navItems.forEach(nav => nav.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));

    // Activate current selection
    targetItem.classList.add('active');
    targetPanel.classList.add('active');
    return true;
}

function handleRouting() {
    const hash = window.location.hash.substring(1); // Lấy phần tabId sau ký tự '#'
    if (hash) {
        const success = switchTab(hash);
        if (success) return;
    }
    
    // Nếu không có hash hoặc hash không hợp lệ, mặc định chọn tab active đầu tiên
    const defaultTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab') || 'config-tab';
    switchTab(defaultTab);
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        
        // Cập nhật hash lên URL để chia sẻ liên kết trực tiếp
        window.location.hash = targetTab;

        // Collapse menu on mobile after selection
        if (navMenu && navMenu.classList.contains('expanded')) {
            navMenu.classList.remove('expanded');
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.remove('active');
            }
            if (menuToggleBtn) {
                menuToggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" id="hamburger-icon">
                        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                `;
            }
        }
    });
});

// Đăng ký các sự kiện lắng nghe để định tuyến thời gian thực
window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', handleRouting);


// Mobile Menu Toggle
if (menuToggleBtn && navMenu) {
    menuToggleBtn.addEventListener('click', () => {
        const isExpanded = navMenu.classList.toggle('expanded');
        if (sidebarBackdrop) {
            sidebarBackdrop.classList.toggle('active', isExpanded);
        }
        
        // Toggle hamburger and close icon
        if (isExpanded) {
            menuToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" id="hamburger-icon">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            `;
        } else {
            menuToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" id="hamburger-icon">
                    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            `;
        }
    });
}

// Click backdrop to collapse menu
if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
        if (navMenu) navMenu.classList.remove('expanded');
        sidebarBackdrop.classList.remove('active');
        if (menuToggleBtn) {
            menuToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" id="hamburger-icon">
                    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            `;
        }
    });
}


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
            copyIcon.classList.add('copied');
            
            setTimeout(() => {
                copyIcon.innerHTML = originalPath;
                copyIcon.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Không thể sao chép văn bản: ', err);
    });
}

// ----------------------------------------------------
// TOOL 6: Epoch/Timestamp Converter
// ----------------------------------------------------
let liveClockInterval = null;
let isLiveClockPaused = false;
let currentEpochUnit = 'ms';

function initLiveClock() {
    updateLiveClock();
    // Cập nhật mượt mà mỗi 50ms để số mili-giây thay đổi liên tục tạo hiệu ứng đẹp
    liveClockInterval = setInterval(updateLiveClock, 50);
}

function updateLiveClock() {
    if (isLiveClockPaused) return;
    const now = new Date();
    const liveEpochMs = document.getElementById('live-epoch-ms');
    const liveLocalTime = document.getElementById('live-local-time');
    
    if (liveEpochMs) liveEpochMs.textContent = now.getTime();
    if (liveLocalTime) liveLocalTime.textContent = formatDate(now);
}

function toggleLiveClock() {
    const btn = document.getElementById('btn-toggle-clock');
    if (!btn) return;
    
    isLiveClockPaused = !isLiveClockPaused;
    if (isLiveClockPaused) {
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" class="btn-svg-sm"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Tiếp tục
        `;
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
    } else {
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" class="btn-svg-sm"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            Tạm dừng
        `;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    }
}

function initEpochInputs() {
    const now = new Date();
    
    // Khởi tạo giá trị ban đầu cho ô nhập Epoch là mốc thời gian hiện tại
    const inputEpoch = document.getElementById('input-epoch');
    if (inputEpoch) {
        inputEpoch.value = now.getTime();
        convertEpochToDate();
    }
    
    // Khởi tạo bộ chọn ngày giờ
    const inputDate = document.getElementById('input-date');
    if (inputDate) {
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
        inputDate.value = localISOTime;
        convertDateToEpoch();
    }
}

function changeEpochUnit(unit) {
    currentEpochUnit = unit;
    const badge = document.getElementById('epoch-unit-badge');
    if (badge) {
        badge.textContent = unit;
    }
    
    // Tự động quy đổi giá trị hiện tại trong input để hỗ trợ trải nghiệm người dùng tốt hơn
    const inputEpoch = document.getElementById('input-epoch');
    if (inputEpoch && inputEpoch.value.trim()) {
        const val = parseFloat(inputEpoch.value.trim());
        if (!isNaN(val)) {
            if (unit === 'ms' && val < 10000000000) {
                // Đang là giây -> đổi sang mili-giây
                inputEpoch.value = Math.round(val * 1000);
            } else if (unit === 's' && val > 9999999999) {
                // Đang là mili-giây -> đổi sang giây
                inputEpoch.value = Math.round(val / 1000);
            }
        }
    }
    convertEpochToDate();
}

function convertEpochToDate() {
    const valStr = document.getElementById('input-epoch').value.trim();
    const localOut = document.getElementById('output-local-time');
    const utcOut = document.getElementById('output-utc-time');
    const relativeOut = document.getElementById('output-relative-time');
    
    if (!valStr) {
        localOut.textContent = '-';
        utcOut.textContent = '-';
        relativeOut.textContent = '-';
        return;
    }
    
    let val = parseFloat(valStr);
    if (isNaN(val)) {
        localOut.textContent = 'Lỗi: Giá trị không hợp lệ (Không phải là số)';
        utcOut.textContent = 'Lỗi: Giá trị không hợp lệ (Không phải là số)';
        relativeOut.textContent = '-';
        return;
    }
    
    val = Math.round(val);
    
    let timestampMs = val;
    if (currentEpochUnit === 's') {
        timestampMs = val * 1000;
    }
    
    // Giới hạn Date trong JS để tránh Overflows
    if (timestampMs < -8640000000000000 || timestampMs > 8640000000000000) {
        localOut.textContent = 'Lỗi: Thời gian vượt quá giới hạn xử lý';
        utcOut.textContent = 'Lỗi: Thời gian vượt quá giới hạn xử lý';
        relativeOut.textContent = '-';
        return;
    }
    
    const date = new Date(timestampMs);
    localOut.textContent = formatDate(date);
    utcOut.textContent = date.toUTCString();
    relativeOut.textContent = getRelativeTimeString(date);
}

function convertDateToEpoch() {
    const dateStr = document.getElementById('input-date').value;
    const msOut = document.getElementById('output-epoch-ms');
    const sOut = document.getElementById('output-epoch-s');
    
    if (!dateStr) {
        msOut.textContent = '-';
        sOut.textContent = '-';
        return;
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        msOut.textContent = 'Lỗi: Ngày giờ không hợp lệ';
        sOut.textContent = 'Lỗi: Ngày giờ không hợp lệ';
        return;
    }
    
    const epochMs = date.getTime();
    const epochS = Math.floor(epochMs / 1000);
    
    msOut.textContent = epochMs;
    sOut.textContent = epochS;
}

function presetDate(preset) {
    const now = new Date();
    const inputDate = document.getElementById('input-date');
    if (!inputDate) return;
    
    let targetDate = new Date();
    if (preset === 'now') {
        targetDate = now;
    } else if (preset === 'today-start') {
        targetDate.setHours(0, 0, 0, 0);
    } else if (preset === 'yesterday-start') {
        targetDate.setDate(targetDate.getDate() - 1);
        targetDate.setHours(0, 0, 0, 0);
    }
    
    const offset = targetDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(targetDate - offset)).toISOString().slice(0, 16);
    inputDate.value = localISOTime;
    
    convertDateToEpoch();
}

function formatDate(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    
    // Timezone offset
    const offsetMin = date.getTimezoneOffset();
    const offsetSign = offsetMin <= 0 ? '+' : '-';
    const offsetHours = pad(Math.floor(Math.abs(offsetMin) / 60));
    const offsetMinutes = pad(Math.abs(offsetMin) % 60);
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${ms} GMT${offsetSign}${offsetHours}:${offsetMinutes}`;
}

function getRelativeTimeString(date) {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const absSec = Math.abs(diffSec);
    
    if (absSec < 5) return 'vừa xong';
    
    const isFuture = diffSec > 0;
    
    const units = [
        { name: 'năm', seconds: 31536000 },
        { name: 'tháng', seconds: 2592000 },
        { name: 'ngày', seconds: 86400 },
        { name: 'giờ', seconds: 3600 },
        { name: 'phút', seconds: 60 },
        { name: 'giây', seconds: 1 }
    ];
    
    for (let unit of units) {
        if (absSec >= unit.seconds) {
            const value = Math.floor(absSec / unit.seconds);
            if (isFuture) {
                return `${value} ${unit.name} tới`;
            } else {
                return `${value} ${unit.name} trước`;
            }
        }
    }
    return 'vừa xong';
}

// ----------------------------------------------------
// SIDEBAR MENU FILTER
// ----------------------------------------------------
// Bản đồ từ khóa thông minh hỗ trợ tìm kiếm nhanh kể cả bằng từ viết tắt hoặc từ đồng nghĩa
const menuKeywords = {
    'config-tab': ['yaml', 'properties', 'config', 'application.properties', 'application.yml', 'yml', 'cấu hình', 'chuyển đổi'],
    'pojo-tab': ['json', 'java', 'pojo', 'class', 'record', 'lombok', 'object', 'model', 'dto', 'entity', 'đối tượng'],
    'jvm-tab': ['jvm', 'heap', 'ram', 'memory', 'calculator', 'gc', 'parallelgc', 'g1gc', 'kubernetes', 'oom', 'bộ nhớ', 'tính toán'],
    'cron-tab': ['scheduled', 'cron', 'task', 'timer', 'expression', 'job', 'spring', 'định kỳ', 'lịch trình'],
    'codec-tab': ['jwt', 'decode', 'base64', 'encrypt', 'authorization', 'basic', 'auth', 'security', 'mã hóa', 'giải mã', 'bảo mật'],
    'epoch-tab': ['epoch', 'timestamp', 'time', 'date', 'millisecond', 'second', 'hệ thống', 'local', 'utc', 'thời gian', 'mili', 'giây'],
    'markdown-tab': ['markdown', 'md', 'docx', 'pdf', 'word', 'convert', 'document', 'chuyển đổi', 'tài liệu', 'văn bản']
};

function filterSidebarMenu() {
    const input = document.getElementById('menu-search-input');
    const clearBtn = document.getElementById('btn-clear-search');
    if (!input) return;
    
    const query = input.value.trim().toLowerCase();
    
    // Hiển thị/Ẩn nút xóa nhanh
    if (clearBtn) {
        clearBtn.classList.toggle('active', !!query);
    }
    
    const items = document.querySelectorAll('.nav-menu .nav-item');
    let visibleCount = 0;
    
    items.forEach(item => {
        const tabId = item.getAttribute('data-tab');
        const text = item.textContent.toLowerCase();
        
        // So khớp từ khóa thông minh (cả tiêu đề hiển thị hoặc danh sách từ khóa đi kèm)
        const keywords = menuKeywords[tabId] || [];
        const hasKeywordMatch = keywords.some(kw => kw.includes(query));
        
        if (text.includes(query) || hasKeywordMatch) {
            item.classList.remove('hidden');
            visibleCount++;
        } else {
            item.classList.add('hidden');
        }
    });
    
    // Xử lý giao diện khi không tìm thấy kết quả
    const navMenu = document.querySelector('.nav-menu');
    let emptyState = document.getElementById('nav-search-empty');
    
    if (visibleCount === 0) {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.id = 'nav-search-empty';
            emptyState.className = 'search-empty-state';
            emptyState.innerHTML = `
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                <span>Không tìm thấy công cụ</span>
            `;
            navMenu.appendChild(emptyState);
        }
    } else {
        if (emptyState) {
            emptyState.remove();
        }
    }
}

function clearMenuSearch() {
    const input = document.getElementById('menu-search-input');
    if (input) {
        input.value = '';
        filterSidebarMenu();
        input.focus();
    }
}

// ----------------------------------------------------
// KEYBOARD SHORTCUTS FOR FILTER & MENU NAVIGATION
// ----------------------------------------------------
function initSidebarKeyboardNavigation() {
    const searchInput = document.getElementById('menu-search-input');
    const brandLogoLink = document.getElementById('brand-logo-link');
    
    // 1. Khi click vào logo thì tải lại trang chính
    if (brandLogoLink) {
        brandLogoLink.addEventListener('click', (e) => {
            if (e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                window.location.href = window.location.pathname; // Tải lại trang chính (xóa hash)
            }
        });
    }

    // 2. Tự động focus vào ô tìm kiếm khi truy cập trang chính trên Desktop
    if (searchInput && (!window.location.hash || window.location.hash === '#config-tab' || window.location.hash === '#')) {
        if (window.innerWidth > 768) {
            searchInput.focus();
        }
    }
    
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearMenuSearch();
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                // Focus vào menu item đầu tiên đang hiển thị
                const visibleItems = Array.from(document.querySelectorAll('.nav-menu .nav-item')).filter(item => !item.classList.contains('hidden'));
                if (visibleItems.length > 0) {
                    visibleItems[0].querySelector('button')?.focus();
                    e.preventDefault();
                }
            }
        });
    }

    // Lắng nghe phím mũi tên trên các nút menu để điều hiện lên xuống dễ dàng
    const menuButtons = document.querySelectorAll('.nav-menu .nav-item button');
    menuButtons.forEach((btn) => {
        btn.addEventListener('keydown', (e) => {
            const currentItem = btn.parentElement;
            const visibleItems = Array.from(document.querySelectorAll('.nav-menu .nav-item')).filter(item => !item.classList.contains('hidden'));
            const currentIndex = visibleItems.indexOf(currentItem);

            if (e.key === 'ArrowDown') {
                const nextItem = visibleItems[currentIndex + 1];
                if (nextItem) {
                    nextItem.querySelector('button')?.focus();
                    e.preventDefault();
                }
            } else if (e.key === 'ArrowUp') {
                const prevItem = visibleItems[currentIndex - 1];
                if (prevItem) {
                    prevItem.querySelector('button')?.focus();
                } else {
                    // Nếu là phần tử đầu tiên, nhấn mũi tên lên sẽ quay lại ô tìm kiếm
                    searchInput?.focus();
                }
                e.preventDefault();
            } else if (e.key === 'Escape') {
                clearMenuSearch();
                searchInput?.focus();
                e.preventDefault();
            }
        });
    });
}

// Khởi chạy đồng hồ thời gian thực và khởi tạo giá trị chuyển đổi
initLiveClock();
initEpochInputs();
initSidebarKeyboardNavigation();

// ----------------------------------------------------
// TOOL 7: DOCX/PDF to Markdown Converter
// ----------------------------------------------------
let selectedMdFile = null;

// Initialize PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function initMarkdownConverter() {
    const dropzone = document.getElementById('md-dropzone');
    const fileInput = document.getElementById('md-file-input');
    const fileInfo = document.getElementById('md-file-info');
    const fileNameText = document.getElementById('md-file-name');
    const fileSizeText = document.getElementById('md-file-size');
    const fileIconWrapper = document.getElementById('md-file-icon-wrapper');
    const btnRemoveFile = document.getElementById('btn-remove-md-file');
    const btnConvert = document.getElementById('btn-convert-md');
    const progressContainer = document.getElementById('md-progress-container');
    const progressBar = document.getElementById('md-progress-bar');
    const progressStatus = document.getElementById('md-progress-status');
    const progressPercent = document.getElementById('md-progress-percent');
    const optionsPanel = document.getElementById('md-options-panel');
    const pdfOptions = document.getElementById('pdf-parsing-options');
    const markdownOutput = document.getElementById('markdown-output');
    const resultActions = document.getElementById('markdown-result-actions');
    const charCountText = document.getElementById('md-char-count');
    const wordCountText = document.getElementById('md-word-count');
    const btnDownload = document.getElementById('btn-download-md');

    if (!dropzone || !fileInput) return;

    // Trigger click on file input when dropzone is clicked
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle drag events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleSelectedFile(files[0]);
        }
    });

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSelectedFile(e.target.files[0]);
        }
    });

    // Remove file selection
    btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering dropzone click
        resetConverterState();
    });

    // Convert file action
    btnConvert.addEventListener('click', async () => {
        if (!selectedMdFile) return;

        // Reset output & display progress
        markdownOutput.value = '';
        resultActions.style.display = 'none';
        progressContainer.style.display = 'flex';
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressStatus.textContent = 'Đang khởi động tiến trình...';
        
        btnConvert.disabled = true;
        btnRemoveFile.disabled = true;

        const isPagebreaks = document.getElementById('md-include-pagebreaks').checked;
        const pdfMode = document.getElementById('pdf-extraction-mode').value;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                let markdown = '';

                if (selectedMdFile.name.endsWith('.docx')) {
                    updateMdProgress('Đang chuyển đổi tệp Word...', 50);
                    markdown = await parseDocxToMarkdown(arrayBuffer);
                } else if (selectedMdFile.name.endsWith('.pdf')) {
                    markdown = await parsePdfToMarkdown(arrayBuffer, isPagebreaks, pdfMode);
                }

                // Show completed state
                updateMdProgress('Chuyển đổi hoàn tất!', 100);
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    btnConvert.disabled = false;
                    btnRemoveFile.disabled = false;
                    
                    markdownOutput.value = markdown;
                    updateStats(markdown);
                    resultActions.style.display = 'flex';
                }, 500);

            } catch (error) {
                console.error(error);
                progressStatus.textContent = 'Lỗi: ' + error.message;
                progressBar.style.backgroundColor = 'var(--color-danger)';
                btnConvert.disabled = false;
                btnRemoveFile.disabled = false;
                markdownOutput.value = `### Đã xảy ra lỗi trong quá trình chuyển đổi\n\nChi tiết lỗi: ${error.message}`;
            }
        };

        reader.onerror = function() {
            progressStatus.textContent = 'Lỗi đọc tệp tin!';
            btnConvert.disabled = false;
            btnRemoveFile.disabled = false;
        };

        reader.readAsArrayBuffer(selectedMdFile);
    });

    // Download Markdown action
    btnDownload.addEventListener('click', () => {
        const text = markdownOutput.value;
        if (!text) return;

        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Use original filename with .md extension
        const originalName = selectedMdFile ? selectedMdFile.name : 'document';
        const lastDot = originalName.lastIndexOf('.');
        const nameWithoutExt = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
        a.download = `${nameWithoutExt}.md`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function handleSelectedFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'docx' && ext !== 'pdf') {
            alert('Chỉ chấp nhận các tệp định dạng .docx hoặc .pdf!');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Kích thước tệp vượt quá giới hạn cho phép (tối đa 10MB)!');
            return;
        }

        selectedMdFile = file;

        // Set name and size
        fileNameText.textContent = file.name;
        fileSizeText.textContent = formatBytes(file.size);

        // Set icon class
        fileIconWrapper.className = `file-icon ${ext}`;
        if (ext === 'docx') {
            fileIconWrapper.innerHTML = `
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6M9 11h6M9 19h3"/></svg>
            `;
            pdfOptions.style.display = 'none';
        } else {
            fileIconWrapper.innerHTML = `
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            `;
            pdfOptions.style.display = 'block';
        }

        // Show info & options panels
        fileInfo.style.display = 'flex';
        optionsPanel.style.display = 'flex';
        dropzone.style.display = 'none';
        btnConvert.disabled = false;
        
        // Reset output
        markdownOutput.value = '';
        resultActions.style.display = 'none';
        progressContainer.style.display = 'none';
    }

    function resetConverterState() {
        selectedMdFile = null;
        fileInput.value = '';
        fileInfo.style.display = 'none';
        optionsPanel.style.display = 'none';
        dropzone.style.display = 'flex';
        btnConvert.disabled = true;
        
        markdownOutput.value = '';
        resultActions.style.display = 'none';
        progressContainer.style.display = 'none';
    }

    function updateMdProgress(status, percent) {
        progressStatus.textContent = status;
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        progressBar.style.backgroundColor = ''; // Reset error color if any
    }

    function updateStats(text) {
        const charCount = text.length;
        // Simple word count supporting unicode/vietnamese
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        
        charCountText.textContent = `${charCount.toLocaleString()} ký tự`;
        wordCountText.textContent = `${wordCount.toLocaleString()} từ`;
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

// DOCX to HTML & Markdown Parser
function parseDocxToMarkdown(arrayBuffer) {
    return new Promise((resolve, reject) => {
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(function(result) {
                const html = result.value;
                const turndownService = new TurndownService({
                    headingStyle: 'atx',
                    hr: '---',
                    bulletListMarker: '-',
                    codeBlockStyle: 'fenced'
                });
                
                // Keep tables formatting by adding simple markdown tables generator
                turndownService.addRule('table', {
                    filter: 'table',
                    replacement: function(content, node) {
                        let markdownTable = '\n\n';
                        const rows = Array.from(node.rows);
                        if (rows.length === 0) return '';
                        
                        rows.forEach((row, rowIndex) => {
                            const cells = Array.from(row.cells);
                            let rowText = '|';
                            cells.forEach(cell => {
                                const cellContent = cell.textContent.trim().replace(/\n/g, ' ');
                                rowText += ` ${cellContent} |`;
                            });
                            markdownTable += rowText + '\n';
                            
                            if (rowIndex === 0) {
                                let separatorRow = '|';
                                cells.forEach(() => {
                                    separatorRow += ' --- |';
                                });
                                markdownTable += separatorRow + '\n';
                            }
                        });
                        
                        return markdownTable + '\n';
                    }
                });

                const markdown = turndownService.turndown(html);
                resolve(markdown);
            })
            .catch(function(err) {
                reject(err);
            });
    });
}

// PDF to text and layout analysis Markdown Parser
async function parsePdfToMarkdown(arrayBuffer, includePagebreaks, mode) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let markdown = '';
    
    // Global progress updating function helper
    const progressContainer = document.getElementById('md-progress-container');
    const progressBar = document.getElementById('md-progress-bar');
    const progressStatus = document.getElementById('md-progress-status');
    const progressPercent = document.getElementById('md-progress-percent');
    function localUpdateProgress(status, percent) {
        if (progressStatus && progressBar && progressPercent) {
            progressStatus.textContent = status;
            progressBar.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;
        }
    }

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const progressVal = Math.round((pageNum / pdf.numPages) * 100);
        localUpdateProgress(`Đang trích xuất trang ${pageNum}/${pdf.numPages}...`, progressVal);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        if (pageNum > 1) {
            if (includePagebreaks) {
                markdown += `\n\n--- (Trang ${pageNum}) ---\n\n`;
            } else {
                markdown += '\n\n';
            }
        } else if (includePagebreaks) {
            markdown += `--- (Trang 1) ---\n\n`;
        }
        
        if (mode === 'plain') {
            const items = textContent.items.map(item => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                height: item.height
            }));
            
            items.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 5) {
                    return a.x - b.x;
                }
                return b.y - a.y;
            });
            
            let lastY = null;
            let pageText = '';
            for (const item of items) {
                if (lastY !== null && Math.abs(item.y - lastY) > 5) {
                    pageText += '\n';
                }
                pageText += item.str;
                lastY = item.y;
            }
            markdown += pageText;
        } else {
            const items = textContent.items.map(item => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                fontName: item.fontName
            }));
            
            if (items.length === 0) continue;
            
            // Group items into lines
            items.sort((a, b) => b.y - a.y);
            
            const lines = [];
            let currentLine = [];
            let currentY = null;
            
            for (const item of items) {
                if (currentY === null) {
                    currentLine.push(item);
                    currentY = item.y;
                } else if (Math.abs(item.y - currentY) < Math.max(item.height * 0.5, 4)) {
                    currentLine.push(item);
                } else {
                    currentLine.sort((a, b) => a.x - b.x);
                    lines.push(currentLine);
                    currentLine = [item];
                    currentY = item.y;
                }
            }
            if (currentLine.length > 0) {
                currentLine.sort((a, b) => a.x - b.x);
                lines.push(currentLine);
            }
            
            let heightSum = 0;
            let textItemsCount = 0;
            for (const line of lines) {
                for (const item of line) {
                    if (item.str.trim()) {
                        heightSum += item.height;
                        textItemsCount++;
                    }
                }
            }
            const avgHeight = textItemsCount > 0 ? (heightSum / textItemsCount) : 10;
            
            let lastLineY = null;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let lineText = '';
                let lastX = null;
                let lineMaxHeight = 0;
                let isBold = false;
                
                for (const item of line) {
                    if (lastX !== null && (item.x - lastX) > 4) {
                        lineText += ' ';
                    }
                    lineText += item.str;
                    lastX = item.x + item.width;
                    if (item.height > lineMaxHeight) {
                        lineMaxHeight = item.height;
                    }
                    if (item.fontName && (item.fontName.toLowerCase().includes('bold') || item.fontName.toLowerCase().includes('g_d0_f2'))) {
                        isBold = true;
                    }
                }
                
                const trimmed = lineText.trim();
                if (!trimmed) continue;
                
                const currentLineY = line[0].y;
                if (lastLineY !== null) {
                    const yDiff = Math.abs(lastLineY - currentLineY);
                    if (yDiff > lineMaxHeight * 2.2) {
                        markdown += '\n\n';
                    } else if (yDiff > lineMaxHeight * 1.2) {
                        markdown += '\n';
                    }
                }
                
                lastLineY = currentLineY;
                
                if (lineMaxHeight > avgHeight * 1.6) {
                    if (lineMaxHeight > avgHeight * 2.2) {
                        markdown += `# ${trimmed}\n`;
                    } else if (lineMaxHeight > avgHeight * 1.8) {
                        markdown += `## ${trimmed}\n`;
                    } else {
                        markdown += `### ${trimmed}\n`;
                    }
                } else if (trimmed.startsWith('•') || trimmed.startsWith('o') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    const cleanVal = trimmed.replace(/^[•o\-*]\s*/, '');
                    markdown += `- ${cleanVal}`;
                } else if (/^\d+[\.\)]\s/.test(trimmed)) {
                    markdown += trimmed;
                } else if (isBold && trimmed.length < 80) {
                    markdown += `**${trimmed}**`;
                } else {
                    markdown += trimmed;
                }
            }
        }
    }
    
    return markdown;
}

// Khởi chạy đồng hồ thời gian thực và khởi tạo giá trị chuyển đổi
initLiveClock();
initEpochInputs();
initSidebarKeyboardNavigation();
initMarkdownConverter();



