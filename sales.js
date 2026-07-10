// Sales Management Module - Custom logic for Sales Suite

(function() {
    // Default Template/Mock Data
    const DEFAULT_DB = {
        storeInfo: {
            name: "GreyTiger Suite Store",
            address: "123 Đường Láng, Đống Đa, Hà Nội",
            phone: "0987654321",
            email: "contact@greytiger.com",
            website: "www.greytigershop.com",
            bankName: "Vietcombank (VCB)",
            bankAccount: "1012345678",
            bankOwner: "NGUYEN KHAC QUAN",
            taxRate: 8, // 8% VAT
            currency: "đ"
        },
        products: [
            { id: "PROD-1001", sku: "SP-001", name: "Bàn phím cơ Keychron K2 V2", category: "Phụ kiện máy tính", cost: 1200000, price: 1850000, quantity: 24, status: "active" },
            { id: "PROD-1002", sku: "SP-002", name: "Chuột không dây Logitech G304", category: "Phụ kiện máy tính", cost: 450000, price: 690000, quantity: 45, status: "active" },
            { id: "PROD-1003", sku: "SP-003", name: "Màn hình Dell UltraSharp U2422H", category: "Màn hình", cost: 4800000, price: 6200000, quantity: 8, status: "active" },
            { id: "PROD-1004", sku: "SP-004", name: "Tai nghe Kingston HyperX Cloud II", category: "Thiết bị âm thanh", cost: 1500000, price: 2150000, quantity: 2, status: "active" },
            { id: "PROD-1005", sku: "SP-005", name: "Cáp sạc nhanh Anker PowerLine III USB-C", category: "Phụ kiện điện thoại", cost: 150000, price: 290000, quantity: 150, status: "active" }
        ],
        customers: [
            { id: "CUST-1001", name: "Nguyễn Văn Anh", phone: "0912345678", email: "vananh@gmail.com", address: "Cầu Giấy, Hà Nội" },
            { id: "CUST-1002", name: "Trần Thị Bình", phone: "0988777666", email: "binh.tran@yahoo.com", address: "Quận 1, TP Hồ Chí Minh" },
            { id: "CUST-1003", name: "Lê Hoàng Hải", phone: "0905111222", email: "hai.le@outlook.com", address: "Hải Châu, Đà Nẵng" }
        ],
        orders: [
            {
                id: "ORD-10001",
                customerId: "CUST-1001",
                customerName: "Nguyễn Văn Anh",
                customerPhone: "0912345678",
                orderDate: "2026-07-08T10:15:30.000Z",
                items: [
                    { productId: "PROD-1001", name: "Bàn phím cơ Keychron K2 V2", price: 1850000, quantity: 1 },
                    { productId: "PROD-1002", name: "Chuột không dây Logitech G304", price: 690000, quantity: 2 }
                ],
                subtotal: 3230000,
                discount: 100000, // 100k VNĐ discount
                taxRate: 8,
                tax: 250400, // (3230000 - 100000) * 8%
                total: 3380400,
                paymentMethod: "Chuyển khoản",
                status: "completed"
            },
            {
                id: "ORD-10002",
                customerId: "CUST-1002",
                customerName: "Trần Thị Bình",
                customerPhone: "0988777666",
                orderDate: "2026-07-09T15:40:00.000Z",
                items: [
                    { productId: "PROD-1003", name: "Màn hình Dell UltraSharp U2422H", price: 6200000, quantity: 1 }
                ],
                subtotal: 6200000,
                discount: 0,
                taxRate: 8,
                tax: 496000,
                total: 6696000,
                paymentMethod: "Thẻ tín dụng",
                status: "completed"
            },
            {
                id: "ORD-10003",
                customerId: "CUST-1003",
                customerName: "Lê Hoàng Hải",
                customerPhone: "0905111222",
                orderDate: "2026-07-10T09:20:00.000Z",
                items: [
                    { productId: "PROD-1004", name: "Tai nghe Kingston HyperX Cloud II", price: 2150000, quantity: 1 },
                    { productId: "PROD-1005", name: "Cáp sạc nhanh Anker PowerLine III USB-C", price: 290000, quantity: 5 }
                ],
                subtotal: 3600000,
                discount: 0,
                taxRate: 8,
                tax: 288000,
                total: 3888000,
                paymentMethod: "Tiền mặt",
                status: "pending"
            }
        ]
    };

    // Global database object
    let salesDb = null;
    let currentCart = []; // Temporary cart for order creation

    // Initialize Application
    function init() {
        loadData();
        setupEventListeners();
        renderAll();
    }

    // Load database from LocalStorage
    function loadData() {
        const stored = localStorage.getItem("qnk_sales_db");
        if (stored) {
            try {
                salesDb = JSON.parse(stored);
                // Validate structure, load defaults for missing top-level components
                if (!salesDb.products) salesDb.products = [];
                if (!salesDb.customers) salesDb.customers = [];
                if (!salesDb.orders) salesDb.orders = [];
                if (!salesDb.storeInfo) salesDb.storeInfo = Object.assign({}, DEFAULT_DB.storeInfo);
            } catch (e) {
                console.error("Lỗi parse dữ liệu bán hàng. Nạp dữ liệu mặc định.", e);
                salesDb = JSON.parse(JSON.stringify(DEFAULT_DB));
                saveData();
            }
        } else {
            // First time load: load default template mock data
            salesDb = JSON.parse(JSON.stringify(DEFAULT_DB));
            saveData();
        }
    }

    // Save database to LocalStorage
    function saveData() {
        localStorage.setItem("qnk_sales_db", JSON.stringify(salesDb));
        updateSyncStatus();
    }

    // Update status indicators in UI
    function updateSyncStatus() {
        const pCount = salesDb.products.length;
        const cCount = salesDb.customers.length;
        const oCount = salesDb.orders.length;
        
        const statusSpan = document.getElementById("sales-db-status-text");
        if (statusSpan) {
            statusSpan.textContent = `Đã lưu: ${pCount} SP, ${cCount} KH, ${oCount} đơn hàng`;
        }
    }

    // Export database to JSON file
    function exportToJson() {
        try {
            const dataStr = JSON.stringify(salesDb, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            
            const tempLink = document.createElement("a");
            tempLink.href = url;
            tempLink.download = `sales_data_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            URL.revokeObjectURL(url);
            
            showToast("Xuất dữ liệu JSON thành công!");
        } catch (e) {
            console.error("Lỗi xuất file JSON", e);
            alert("Không thể xuất dữ liệu: " + e.message);
        }
    }

    // Import database from JSON file
    function importFromJson(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                
                // Validate schema basics
                if (imported && (imported.products || imported.customers || imported.orders || imported.storeInfo)) {
                    salesDb = {
                        storeInfo: imported.storeInfo || Object.assign({}, DEFAULT_DB.storeInfo),
                        products: imported.products || [],
                        customers: imported.customers || [],
                        orders: imported.orders || []
                    };
                    saveData();
                    renderAll();
                    showToast("Nhập dữ liệu thành công!");
                } else {
                    alert("Định dạng file JSON không khớp cấu hình cơ sở dữ liệu bán hàng.");
                }
            } catch (err) {
                console.error("Lỗi parse file JSON tải lên", err);
                alert("File tải lên không hợp lệ hoặc bị lỗi cấu trúc JSON.");
            }
            // Reset file input
            event.target.value = "";
        };
        reader.readAsText(file);
    }

    // Reset database to templates
    function resetDatabase() {
        if (confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ dữ liệu hiện tại và thay thế bằng dữ liệu mẫu. Bạn có chắc chắn muốn tiếp tục?")) {
            salesDb = JSON.parse(JSON.stringify(DEFAULT_DB));
            saveData();
            renderAll();
            showToast("Đã khôi phục dữ liệu mẫu thành công.");
        }
    }

    // ----------------------------------------------------
    // RENDERING & SUB-TABS INTERACTIVE CONTROL
    // ----------------------------------------------------
    function setupEventListeners() {
        // Tab switching within Sales Management Panel
        const subNavButtons = document.querySelectorAll(".sales-nav-btn");
        const subPanels = document.querySelectorAll(".sales-sub-panel");

        subNavButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetPanelId = btn.getAttribute("data-sales-sub");
                
                subNavButtons.forEach(b => b.classList.remove("active"));
                subPanels.forEach(p => p.classList.remove("active"));
                
                btn.classList.add("active");
                const panel = document.getElementById(targetPanelId);
                if (panel) panel.classList.add("active");

                // Render specific section upon opening
                if (targetPanelId === "sales-sub-products") renderProducts();
                else if (targetPanelId === "sales-sub-customers") renderCustomers();
                else if (targetPanelId === "sales-sub-orders") renderOrders();
                else if (targetPanelId === "sales-sub-settings") renderSettings();
                else if (targetPanelId === "sales-sub-dashboard") renderDashboard();
            });
        });

        // JSON file operations
        document.getElementById("btn-export-sales-json")?.addEventListener("click", exportToJson);
        
        const fileInput = document.getElementById("sales-import-file-input");
        if (fileInput) {
            fileInput.addEventListener("change", importFromJson);
        }
        document.getElementById("btn-import-sales-json")?.addEventListener("click", () => {
            fileInput.click();
        });
        document.getElementById("btn-reset-sales-db")?.addEventListener("click", resetDatabase);

        // Product search and filter
        document.getElementById("sales-prod-search")?.addEventListener("input", renderProducts);
        document.getElementById("sales-prod-filter-cat")?.addEventListener("change", renderProducts);

        // Customer search
        document.getElementById("sales-cust-search")?.addEventListener("input", renderCustomers);

        // Order filters
        document.getElementById("sales-order-search")?.addEventListener("input", renderOrders);
        document.getElementById("sales-order-filter-status")?.addEventListener("change", renderOrders);

        // Settings saving
        document.getElementById("sales-settings-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            saveSettings();
        });

        // Product Form submit
        document.getElementById("sales-prod-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            saveProductForm();
        });

        // Customer Form submit
        document.getElementById("sales-cust-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            saveCustomerForm();
        });

        // Cart Order submission
        document.getElementById("btn-submit-order")?.addEventListener("click", submitNewOrder);
        document.getElementById("order-select-customer")?.addEventListener("change", updateOrderCheckoutDetails);
        document.getElementById("order-discount")?.addEventListener("input", updateOrderCheckoutDetails);
        document.getElementById("order-discount-type")?.addEventListener("change", updateOrderCheckoutDetails);
        document.getElementById("order-payment-method")?.addEventListener("change", updateOrderCheckoutDetails);
    }

    function renderAll() {
        updateSyncStatus();
        renderDashboard();
        renderProducts();
        renderCustomers();
        renderOrders();
        renderSettings();
    }

    // Formatter helpers
    function formatCurrency(number) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number)
            .replace('₫', salesDb.storeInfo.currency || 'đ');
    }

    function formatDateTime(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleDateString("vi-VN", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit"
        });
    }

    // ----------------------------------------------------
    // DASHBOARD PANEL
    // ----------------------------------------------------
    function renderDashboard() {
        const stats = {
            revenue: 0,
            cost: 0,
            profit: 0,
            completedOrdersCount: 0,
            pendingOrdersCount: 0,
            totalOrders: 0,
            stockAlert: 0
        };

        // Filter status 'completed' and 'paid' / 'shipped' for revenue, pending for count
        salesDb.orders.forEach(order => {
            if (order.status !== "cancelled") {
                stats.totalOrders++;
                if (order.status === "completed" || order.status === "paid" || order.status === "shipped") {
                    stats.revenue += order.total;
                    stats.completedOrdersCount++;
                    
                    // Estimate Cost of Goods Sold (COGS)
                    let orderCost = 0;
                    order.items.forEach(item => {
                        const prod = salesDb.products.find(p => p.id === item.productId);
                        const itemCost = prod ? prod.cost : (item.price * 0.7); // Fallback: cost is 70% of price
                        orderCost += itemCost * item.quantity;
                    });
                    stats.cost += orderCost;
                } else if (order.status === "pending") {
                    stats.pendingOrdersCount++;
                }
            }
        });

        stats.profit = stats.revenue - stats.cost;

        // Check low stock products
        salesDb.products.forEach(p => {
            if (p.quantity <= 5 && p.status === "active") {
                stats.stockAlert++;
            }
        });

        // Set UI values
        const revEl = document.getElementById("dash-stat-revenue");
        if (revEl) revEl.textContent = formatCurrency(stats.revenue);

        const profEl = document.getElementById("dash-stat-profit");
        if (profEl) {
            profEl.textContent = formatCurrency(stats.profit);
            profEl.className = stats.profit >= 0 ? "success" : "danger";
        }

        const ordEl = document.getElementById("dash-stat-orders");
        if (ordEl) ordEl.textContent = `${stats.completedOrdersCount} / ${stats.totalOrders} đơn`;

        const stockEl = document.getElementById("dash-stat-stock-alert");
        if (stockEl) {
            stockEl.textContent = `${stats.stockAlert} sản phẩm`;
            if (stats.stockAlert > 0) {
                stockEl.closest(".sales-stat-card").style.borderColor = "rgba(245, 158, 11, 0.4)";
            } else {
                stockEl.closest(".sales-stat-card").style.borderColor = "";
            }
        }

        // Render Recent Orders List in Dashboard
        const listBody = document.getElementById("dash-recent-orders-list");
        if (!listBody) return;

        listBody.innerHTML = "";
        
        // Sort by date desc, slice top 5
        const recentOrders = [...salesDb.orders]
            .sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate))
            .slice(0, 5);

        if (recentOrders.length === 0) {
            listBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dark);">Chưa có đơn hàng nào được ghi nhận.</td></tr>`;
            return;
        }

        recentOrders.forEach(ord => {
            const tr = document.createElement("tr");
            
            let statusBadge = "";
            if (ord.status === "completed") statusBadge = `<span class="badge badge-success">Hoàn thành</span>`;
            else if (ord.status === "paid") statusBadge = `<span class="badge badge-success">Đã TT</span>`;
            else if (ord.status === "pending") statusBadge = `<span class="badge badge-warning">Chờ thanh toán</span>`;
            else if (ord.status === "shipped") statusBadge = `<span class="badge badge-info">Đang giao</span>`;
            else if (ord.status === "cancelled") statusBadge = `<span class="badge badge-danger">Đã hủy</span>`;

            tr.innerHTML = `
                <td><strong>${ord.id}</strong></td>
                <td>${ord.customerName}</td>
                <td>${formatDateTime(ord.orderDate)}</td>
                <td><strong>${formatCurrency(ord.total)}</strong></td>
                <td>${statusBadge}</td>
            `;
            listBody.appendChild(tr);
        });
    }

    // ----------------------------------------------------
    // PRODUCTS PANEL
    // ----------------------------------------------------
    function renderProducts() {
        const listBody = document.getElementById("sales-products-list");
        if (!listBody) return;

        listBody.innerHTML = "";

        const searchVal = (document.getElementById("sales-prod-search")?.value || "").toLowerCase().trim();
        const catVal = document.getElementById("sales-prod-filter-cat")?.value || "all";

        // Collect distinct categories to populate filter dynamically
        const categories = new Set();
        salesDb.products.forEach(p => {
            if (p.category) categories.add(p.category);
        });

        // Populate Category Filter dropdown
        const catSelect = document.getElementById("sales-prod-filter-cat");
        if (catSelect && catSelect.children.length <= 1) {
            // Keep first option "Tất cả danh mục" and append
            categories.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = cat;
                catSelect.appendChild(opt);
            });
        }

        // Filtering
        const filtered = salesDb.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.sku.toLowerCase().includes(searchVal);
            const matchesCat = (catVal === "all") || (p.category === catVal);
            return matchesSearch && matchesCat;
        });

        if (filtered.length === 0) {
            listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dark); padding: 30px 0;">Không tìm thấy sản phẩm nào khớp bộ lọc.</td></tr>`;
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement("tr");

            let stockText = `${p.quantity}`;
            let stockClass = "";
            if (p.quantity === 0) {
                stockText = `<span class="badge badge-danger">Hết hàng</span>`;
            } else if (p.quantity <= 5) {
                stockText = `<span class="badge badge-warning">${p.quantity} (Sắp hết)</span>`;
            }

            const statusBadge = p.status === "active" 
                ? `<span class="badge badge-success">Kinh doanh</span>` 
                : `<span class="badge badge-dark">Ngừng bán</span>`;

            tr.innerHTML = `
                <td><code>${p.sku}</code></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category || '<span class="text-muted">N/A</span>'}</td>
                <td>${formatCurrency(p.cost)}</td>
                <td><strong>${formatCurrency(p.price)}</strong></td>
                <td>${stockText}</td>
                <td>${statusBadge}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit" onclick="SalesApp.openProductModal('${p.id}')" title="Chỉnh sửa">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                    </button>
                    <button class="btn-icon delete" onclick="SalesApp.deleteProduct('${p.id}')" title="Xóa">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </td>
            `;
            listBody.appendChild(tr);
        });
    }

    // Open Modal Product to Create/Edit
    function openProductModal(productId = null) {
        const modal = document.getElementById("modal-sales-product");
        const titleEl = document.getElementById("sales-product-modal-title");
        const form = document.getElementById("sales-prod-form");

        if (!modal || !form) return;

        // Reset form
        form.reset();
        document.getElementById("sales-prod-id").value = "";

        if (productId) {
            titleEl.textContent = "Chỉnh sửa sản phẩm";
            const p = salesDb.products.find(item => item.id === productId);
            if (p) {
                document.getElementById("sales-prod-id").value = p.id;
                document.getElementById("sales-prod-sku").value = p.sku;
                document.getElementById("sales-prod-name").value = p.name;
                document.getElementById("sales-prod-cat").value = p.category;
                document.getElementById("sales-prod-cost").value = p.cost;
                document.getElementById("sales-prod-price").value = p.price;
                document.getElementById("sales-prod-qty").value = p.quantity;
                document.getElementById("sales-prod-status").value = p.status;
            }
        } else {
            titleEl.textContent = "Thêm sản phẩm mới";
            // Autogenerate SKU
            const newIndex = salesDb.products.length + 1;
            document.getElementById("sales-prod-sku").value = "SP-" + String(newIndex).padStart(3, '0');
            document.getElementById("sales-prod-status").value = "active";
            document.getElementById("sales-prod-qty").value = 10;
        }

        modal.classList.add("active");
    }

    function closeProductModal() {
        document.getElementById("modal-sales-product")?.classList.remove("active");
    }

    function saveProductForm() {
        const id = document.getElementById("sales-prod-id").value;
        const sku = document.getElementById("sales-prod-sku").value.trim();
        const name = document.getElementById("sales-prod-name").value.trim();
        const category = document.getElementById("sales-prod-cat").value.trim();
        const cost = parseInt(document.getElementById("sales-prod-cost").value) || 0;
        const price = parseInt(document.getElementById("sales-prod-price").value) || 0;
        const quantity = parseInt(document.getElementById("sales-prod-qty").value) || 0;
        const status = document.getElementById("sales-prod-status").value;

        if (!sku || !name) {
            alert("Vui lòng điền mã SKU và tên sản phẩm.");
            return;
        }

        if (price < cost) {
            if (!confirm("Cảnh báo: Giá bán đang nhỏ hơn Giá vốn! Bạn vẫn muốn tiếp tục?")) {
                return;
            }
        }

        if (id) {
            // Edit existing
            const pIdx = salesDb.products.findIndex(item => item.id === id);
            if (pIdx !== -1) {
                // Ensure unique SKU
                const duplicate = salesDb.products.find(item => item.sku === sku && item.id !== id);
                if (duplicate) {
                    alert("Lỗi: Mã SKU '" + sku + "' đã tồn tại ở sản phẩm khác.");
                    return;
                }

                salesDb.products[pIdx] = { id, sku, name, category, cost, price, quantity, status };
                showToast("Đã cập nhật sản phẩm thành công!");
            }
        } else {
            // Check unique SKU
            const duplicate = salesDb.products.find(item => item.sku === sku);
            if (duplicate) {
                alert("Lỗi: Mã SKU '" + sku + "' đã được sử dụng.");
                return;
            }

            // Create new
            const newId = "PROD-" + Date.now();
            salesDb.products.push({ id: newId, sku, name, category, cost, price, quantity, status });
            showToast("Đã thêm sản phẩm mới thành công!");
        }

        saveData();
        closeProductModal();
        renderProducts();
        renderDashboard();
    }

    function deleteProduct(productId) {
        // Check if product is in any orders
        const isUsed = salesDb.orders.some(o => o.items.some(i => i.productId === productId));
        if (isUsed) {
            if (confirm("Sản phẩm này đã tồn tại trong lịch sử đơn hàng. Việc xóa hoàn toàn sẽ gây lỗi báo cáo. Bạn có muốn Đổi trạng thái sang 'Ngừng bán' thay vì xóa hoàn toàn?")) {
                const prod = salesDb.products.find(p => p.id === productId);
                if (prod) {
                    prod.status = "inactive";
                    saveData();
                    renderProducts();
                    showToast("Đã đổi trạng thái sản phẩm sang Ngừng bán.");
                }
            }
            return;
        }

        if (confirm("Bạn chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác.")) {
            salesDb.products = salesDb.products.filter(item => item.id !== productId);
            saveData();
            renderProducts();
            renderDashboard();
            showToast("Đã xóa sản phẩm thành công.");
        }
    }

    // ----------------------------------------------------
    // CUSTOMERS PANEL
    // ----------------------------------------------------
    function renderCustomers() {
        const listBody = document.getElementById("sales-customers-list");
        if (!listBody) return;

        listBody.innerHTML = "";

        const searchVal = (document.getElementById("sales-cust-search")?.value || "").toLowerCase().trim();

        // Calculate statistics per customer from orders
        const custStats = {};
        salesDb.orders.forEach(o => {
            if (o.status !== "cancelled") {
                if (!custStats[o.customerId]) {
                    custStats[o.customerId] = { count: 0, spent: 0 };
                }
                custStats[o.customerId].count++;
                if (o.status === "completed" || o.status === "paid" || o.status === "shipped") {
                    custStats[o.customerId].spent += o.total;
                }
            }
        });

        // Filter
        const filtered = salesDb.customers.filter(c => {
            return c.name.toLowerCase().includes(searchVal) || 
                   c.phone.includes(searchVal) || 
                   (c.email && c.email.toLowerCase().includes(searchVal));
        });

        if (filtered.length === 0) {
            listBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dark); padding: 30px 0;">Không tìm thấy khách hàng nào.</td></tr>`;
            return;
        }

        filtered.forEach(c => {
            const tr = document.createElement("tr");
            const stat = custStats[c.id] || { count: 0, spent: 0 };

            tr.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td><code>${c.phone}</code></td>
                <td>${c.email || '<span class="text-dark">Trống</span>'}</td>
                <td>${c.address || '<span class="text-dark">Trống</span>'}</td>
                <td><span class="badge badge-info">${stat.count} đơn</span></td>
                <td><strong>${formatCurrency(stat.spent)}</strong></td>
                <td class="actions-cell">
                    <button class="btn-icon edit" onclick="SalesApp.openCustomerModal('${c.id}')" title="Chỉnh sửa">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                    </button>
                    <button class="btn-icon delete" onclick="SalesApp.deleteCustomer('${c.id}')" title="Xóa">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </td>
            `;
            listBody.appendChild(tr);
        });
    }

    function openCustomerModal(customerId = null) {
        const modal = document.getElementById("modal-sales-customer");
        const titleEl = document.getElementById("sales-customer-modal-title");
        const form = document.getElementById("sales-cust-form");

        if (!modal || !form) return;

        form.reset();
        document.getElementById("sales-cust-id").value = "";

        if (customerId) {
            titleEl.textContent = "Chỉnh sửa khách hàng";
            const c = salesDb.customers.find(item => item.id === customerId);
            if (c) {
                document.getElementById("sales-cust-id").value = c.id;
                document.getElementById("sales-cust-name").value = c.name;
                document.getElementById("sales-cust-phone").value = c.phone;
                document.getElementById("sales-cust-email").value = c.email || "";
                document.getElementById("sales-cust-address").value = c.address || "";
            }
        } else {
            titleEl.textContent = "Thêm khách hàng mới";
        }

        modal.classList.add("active");
    }

    function closeCustomerModal() {
        document.getElementById("modal-sales-customer")?.classList.remove("active");
    }

    function saveCustomerForm() {
        const id = document.getElementById("sales-cust-id").value;
        const name = document.getElementById("sales-cust-name").value.trim();
        const phone = document.getElementById("sales-cust-phone").value.trim();
        const email = document.getElementById("sales-cust-email").value.trim();
        const address = document.getElementById("sales-cust-address").value.trim();

        if (!name || !phone) {
            alert("Vui lòng điền tên và số điện thoại khách hàng.");
            return;
        }

        if (id) {
            // Edit
            const cIdx = salesDb.customers.findIndex(item => item.id === id);
            if (cIdx !== -1) {
                // Phone duplicate check
                const duplicate = salesDb.customers.find(item => item.phone === phone && item.id !== id);
                if (duplicate) {
                    alert("Số điện thoại này đã được sử dụng bởi khách hàng khác: " + duplicate.name);
                    return;
                }

                salesDb.customers[cIdx] = { id, name, phone, email, address };
                showToast("Đã cập nhật khách hàng thành công!");
            }
        } else {
            // Check phone duplication
            const duplicate = salesDb.customers.find(item => item.phone === phone);
            if (duplicate) {
                alert("Lỗi: Số điện thoại này đã đăng ký cho khách hàng: " + duplicate.name);
                return;
            }

            // Create new
            const newId = "CUST-" + Date.now();
            salesDb.customers.push({ id: newId, name, phone, email, address });
            showToast("Thêm khách hàng mới thành công!");
        }

        saveData();
        closeCustomerModal();
        renderCustomers();
        
        // Refresh customer selector in cart order creator if open
        initOrderCreatorCustomerSelect();
    }

    function deleteCustomer(customerId) {
        // Check if customer has orders
        const hasOrders = salesDb.orders.some(o => o.customerId === customerId);
        if (hasOrders) {
            alert("Không thể xóa khách hàng này do đang có liên kết với lịch sử đơn hàng. Hãy sửa đổi đơn hàng trước hoặc ẩn thông tin.");
            return;
        }

        if (confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) {
            salesDb.customers = salesDb.customers.filter(item => item.id !== customerId);
            saveData();
            renderCustomers();
            showToast("Xóa khách hàng thành công.");
        }
    }

    // ----------------------------------------------------
    // ORDER PANEL & MANAGEMENT
    // ----------------------------------------------------
    function renderOrders() {
        const listBody = document.getElementById("sales-orders-list");
        if (!listBody) return;

        listBody.innerHTML = "";

        const searchVal = (document.getElementById("sales-order-search")?.value || "").toLowerCase().trim();
        const statusVal = document.getElementById("sales-order-filter-status")?.value || "all";

        // Filtering
        const filtered = salesDb.orders.filter(ord => {
            const matchesSearch = ord.id.toLowerCase().includes(searchVal) || 
                                 ord.customerName.toLowerCase().includes(searchVal) || 
                                 ord.customerPhone.includes(searchVal);
            const matchesStatus = (statusVal === "all") || (ord.status === statusVal);
            return matchesSearch && matchesStatus;
        });

        // Sort by date desc
        filtered.sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate));

        if (filtered.length === 0) {
            listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dark); padding: 30px 0;">Không tìm thấy đơn hàng nào.</td></tr>`;
            return;
        }

        filtered.forEach(ord => {
            const tr = document.createElement("tr");

            let statusBadge = "";
            let actionDropdown = ``;

            if (ord.status === "completed") {
                statusBadge = `<span class="badge badge-success">Hoàn thành</span>`;
            } else if (ord.status === "paid") {
                statusBadge = `<span class="badge badge-success">Đã thanh toán</span>`;
            } else if (ord.status === "shipped") {
                statusBadge = `<span class="badge badge-info">Đang giao</span>`;
            } else if (ord.status === "pending") {
                statusBadge = `<span class="badge badge-warning">Chờ thanh toán</span>`;
            } else if (ord.status === "cancelled") {
                statusBadge = `<span class="badge badge-danger">Đã hủy</span>`;
            }

            // Quick select for status changes (if not cancelled)
            let statusSelectHtml = "";
            if (ord.status !== "cancelled" && ord.status !== "completed") {
                statusSelectHtml = `
                    <select class="btn-icon" style="width: auto; padding: 2px 6px; font-size: 11px; height: 32px;" onchange="SalesApp.changeOrderStatus('${ord.id}', this.value)" title="Chuyển trạng thái">
                        <option value="" disabled selected>Trạng thái</option>
                        ${ord.status === 'pending' ? '<option value="paid">Đã thanh toán</option>' : ''}
                        ${(ord.status === 'pending' || ord.status === 'paid') ? '<option value="shipped">Giao hàng</option>' : ''}
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Hủy đơn</option>
                    </select>
                `;
            }

            tr.innerHTML = `
                <td><strong>${ord.id}</strong></td>
                <td>
                    <div><strong>${ord.customerName}</strong></div>
                    <div style="font-size: 11px; color: var(--text-muted);">${ord.customerPhone}</div>
                </td>
                <td>${formatDateTime(ord.orderDate)}</td>
                <td><strong>${formatCurrency(ord.total)}</strong></td>
                <td>${ord.paymentMethod}</td>
                <td>${statusBadge}</td>
                <td class="actions-cell">
                    <button class="btn-icon view" onclick="SalesApp.viewOrderInvoice('${ord.id}')" title="Xem hóa đơn/In">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </button>
                    ${statusSelectHtml}
                </td>
            `;
            listBody.appendChild(tr);
        });
    }

    function changeOrderStatus(orderId, newStatus) {
        if (!newStatus) return;

        const ord = salesDb.orders.find(o => o.id === orderId);
        if (!ord) return;

        const oldStatus = ord.status;
        if (oldStatus === newStatus) return;

        // If cancelling order, return items quantity back to stock
        if (newStatus === "cancelled" && oldStatus !== "cancelled") {
            if (confirm(`Bạn chắc chắn muốn hủy đơn hàng ${orderId}? Số lượng tồn kho sản phẩm sẽ được cộng hoàn trả lại.`)) {
                ord.items.forEach(item => {
                    const prod = salesDb.products.find(p => p.id === item.productId);
                    if (prod) {
                        prod.quantity += item.quantity;
                    }
                });
                ord.status = newStatus;
                saveData();
                renderOrders();
                renderProducts();
                renderDashboard();
                showToast(`Đã hủy đơn ${orderId} và hoàn kho thành công.`);
            }
        } else {
            ord.status = newStatus;
            saveData();
            renderOrders();
            renderDashboard();
            showToast(`Đã cập nhật trạng thái đơn ${orderId} thành công.`);
        }
    }

    // ----------------------------------------------------
    // ORDER CREATION LOGIC (Dual Pane Creator)
    // ----------------------------------------------------
    function initOrderCreatorCustomerSelect() {
        const select = document.getElementById("order-select-customer");
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>-- Chọn khách hàng --</option>';
        salesDb.customers.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.phone})`;
            select.appendChild(opt);
        });
    }

    function renderOrderCreatorProducts() {
        const gridContainer = document.getElementById("order-creator-products-grid");
        if (!gridContainer) return;

        gridContainer.innerHTML = "";

        const searchVal = (document.getElementById("order-creator-prod-search")?.value || "").toLowerCase().trim();

        // Filter products (only active)
        const activeProds = salesDb.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.sku.toLowerCase().includes(searchVal);
            return p.status === "active" && matchesSearch;
        });

        if (activeProds.length === 0) {
            gridContainer.innerHTML = `<div style="grid-column: span 10; text-align: center; color: var(--text-dark); padding: 20px;">Không tìm thấy sản phẩm.</div>`;
            return;
        }

        activeProds.forEach(p => {
            const card = document.createElement("div");
            card.className = "grid-prod-card";
            
            // Check current items in cart to display remaining virtual stock
            const cartItem = currentCart.find(item => item.productId === p.id);
            const virtualQty = p.quantity - (cartItem ? cartItem.quantity : 0);

            let stockBadge = "";
            let disabledStyle = "";
            if (virtualQty === 0) {
                stockBadge = `<span class="prod-stock out-of-stock">Hết hàng</span>`;
            } else if (virtualQty <= 5) {
                stockBadge = `<span class="prod-stock low-stock">Tồn: ${virtualQty}</span>`;
            } else {
                stockBadge = `<span class="prod-stock">Tồn: ${virtualQty}</span>`;
            }

            card.innerHTML = `
                <div>
                    <span class="prod-category">${p.category || 'N/A'}</span>
                    <h4 class="prod-name">${p.name}</h4>
                </div>
                <div class="prod-footer">
                    <span class="prod-price">${formatCurrency(p.price)}</span>
                    ${stockBadge}
                </div>
            `;

            // Click event to add item to cart
            card.addEventListener("click", () => {
                if (virtualQty <= 0) {
                    alert("Sản phẩm đã hết hàng trong kho hoặc đã được thêm toàn bộ vào giỏ hàng.");
                    return;
                }
                addToCart(p);
            });

            gridContainer.appendChild(card);
        });
    }

    function openOrderCreator() {
        const modal = document.getElementById("modal-sales-order-creator");
        if (!modal) return;

        // Reset cart
        currentCart = [];
        document.getElementById("order-creator-prod-search").value = "";
        document.getElementById("order-discount").value = 0;
        document.getElementById("order-discount-type").value = "value";
        document.getElementById("order-notes").value = "";
        
        initOrderCreatorCustomerSelect();
        renderOrderCreatorProducts();
        renderCart();

        modal.classList.add("active");
    }

    function closeOrderCreator() {
        document.getElementById("modal-sales-order-creator")?.classList.remove("active");
    }

    function addToCart(product) {
        const existing = currentCart.find(item => item.productId === product.id);
        if (existing) {
            if (existing.quantity < product.quantity) {
                existing.quantity++;
            } else {
                alert(`Không thể thêm. Kho hàng chỉ còn lại ${product.quantity} sản phẩm.`);
                return;
            }
        } else {
            currentCart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            });
        }
        renderCart();
        renderOrderCreatorProducts(); // Update stock count indicators
    }

    function updateCartQty(productId, qty) {
        const item = currentCart.find(i => i.productId === productId);
        if (!item) return;

        const prod = salesDb.products.find(p => p.id === productId);
        if (!prod) return;

        const parsedQty = parseInt(qty);
        if (isNaN(parsedQty) || parsedQty <= 0) {
            removeFromCart(productId);
            return;
        }

        if (parsedQty > prod.quantity) {
            alert(`Kho chỉ còn lại tối đa ${prod.quantity} sản phẩm.`);
            item.quantity = prod.quantity;
        } else {
            item.quantity = parsedQty;
        }

        renderCart();
        renderOrderCreatorProducts();
    }

    function removeFromCart(productId) {
        currentCart = currentCart.filter(item => item.productId !== productId);
        renderCart();
        renderOrderCreatorProducts();
    }

    function renderCart() {
        const listContainer = document.getElementById("order-cart-items-list");
        if (!listContainer) return;

        listContainer.innerHTML = "";

        if (currentCart.length === 0) {
            listContainer.innerHTML = `
                <div class="cart-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Giỏ hàng trống. Click sản phẩm để thêm.
                </div>
            `;
            updateOrderCheckoutDetails();
            return;
        }

        currentCart.forEach(item => {
            const row = document.createElement("div");
            row.className = "cart-item";
            
            const totalVal = item.price * item.quantity;

            row.innerHTML = `
                <div class="cart-item-details">
                    <div class="cart-item-name" title="${item.name}">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-qty-control">
                    <button type="button" onclick="SalesApp.updateCartQty('${item.productId}', ${item.quantity - 1})">-</button>
                    <input type="number" value="${item.quantity}" onchange="SalesApp.updateCartQty('${item.productId}', this.value)">
                    <button type="button" onclick="SalesApp.updateCartQty('${item.productId}', ${item.quantity + 1})">+</button>
                </div>
                <div class="cart-item-total">${formatCurrency(totalVal)}</div>
                <button type="button" class="cart-item-remove" onclick="SalesApp.removeFromCart('${item.productId}')" title="Xóa khỏi đơn">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            listContainer.appendChild(row);
        });

        updateOrderCheckoutDetails();
    }

    function updateOrderCheckoutDetails() {
        // Calculations
        let subtotal = 0;
        currentCart.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        const discountInput = parseInt(document.getElementById("order-discount").value) || 0;
        const discountType = document.getElementById("order-discount-type").value;
        
        let discount = 0;
        if (discountType === "percent") {
            discount = Math.round((subtotal * discountInput) / 100);
        } else {
            discount = discountInput;
        }

        // Apply discount constraint
        discount = Math.min(discount, subtotal);

        // Tax calculation based on shop tax rate settings
        const taxRate = salesDb.storeInfo.taxRate || 0;
        const taxableAmount = Math.max(0, subtotal - discount);
        const tax = Math.round((taxableAmount * taxRate) / 100);

        const total = taxableAmount + tax;

        // Render in UI
        const subtotalEl = document.getElementById("order-calc-subtotal");
        if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);

        const discountEl = document.getElementById("order-calc-discount");
        if (discountEl) discountEl.textContent = formatCurrency(discount);

        const taxEl = document.getElementById("order-calc-tax");
        if (taxEl) taxEl.textContent = `${formatCurrency(tax)} (${taxRate}%)`;

        const totalEl = document.getElementById("order-calc-total");
        if (totalEl) totalEl.textContent = formatCurrency(total);
    }

    function submitNewOrder() {
        if (currentCart.length === 0) {
            alert("Giỏ hàng của bạn đang trống. Vui lòng thêm ít nhất một sản phẩm.");
            return;
        }

        const customerId = document.getElementById("order-select-customer").value;
        if (!customerId) {
            alert("Vui lòng chọn hoặc tạo khách hàng cho đơn hàng này.");
            return;
        }

        const customer = salesDb.customers.find(c => c.id === customerId);
        if (!customer) return;

        // Perform final quantity validations against master DB stock
        let stockOk = true;
        currentCart.forEach(item => {
            const prod = salesDb.products.find(p => p.id === item.productId);
            if (!prod || prod.quantity < item.quantity) {
                alert(`Lỗi tồn kho: Sản phẩm '${item.name}' chỉ còn lại ${prod ? prod.quantity : 0} trong kho. Vui lòng giảm số lượng.`);
                stockOk = false;
            }
        });

        if (!stockOk) return;

        // Deduct quantities in database
        currentCart.forEach(item => {
            const prod = salesDb.products.find(p => p.id === item.productId);
            if (prod) {
                prod.quantity -= item.quantity;
            }
        });

        // Calculations
        let subtotal = 0;
        currentCart.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        const discountInput = parseInt(document.getElementById("order-discount").value) || 0;
        const discountType = document.getElementById("order-discount-type").value;
        let discount = (discountType === "percent") ? Math.round((subtotal * discountInput) / 100) : discountInput;
        discount = Math.min(discount, subtotal);

        const taxRate = salesDb.storeInfo.taxRate || 0;
        const tax = Math.round((Math.max(0, subtotal - discount) * taxRate) / 100);
        const total = Math.max(0, subtotal - discount) + tax;

        const paymentMethod = document.getElementById("order-payment-method").value;
        const notes = document.getElementById("order-notes").value.trim();

        // Create order entity
        const orderId = "ORD-" + (10000 + salesDb.orders.length + 1);
        const newOrder = {
            id: orderId,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            orderDate: new Date().toISOString(),
            items: currentCart,
            subtotal,
            discount,
            taxRate,
            tax,
            total,
            paymentMethod,
            status: paymentMethod === "Chuyển khoản" ? "pending" : "completed", // Wire transfers start pending
            notes: notes || undefined
        };

        salesDb.orders.push(newOrder);
        saveData();
        closeOrderCreator();
        
        // Refresh views
        renderOrders();
        renderProducts();
        renderDashboard();
        
        showToast(`Đã tạo thành công đơn hàng ${orderId}!`);

        // Ask if they want to view the receipt immediately
        if (confirm(`Đơn hàng ${orderId} đã được tạo. Bạn có muốn xem hóa đơn và in ngay không?`)) {
            viewOrderInvoice(orderId);
        }
    }

    // ----------------------------------------------------
    // INVOICE DETAIL & PRINTING
    // ----------------------------------------------------
    function viewOrderInvoice(orderId) {
        const ord = salesDb.orders.find(o => o.id === orderId);
        if (!ord) return;

        const modal = document.getElementById("modal-sales-invoice-preview");
        if (!modal) return;

        // Render Invoice Content
        const printArea = document.getElementById("invoice-print-area");
        if (!printArea) return;

        const shop = salesDb.storeInfo;
        const bankInfoHTML = (shop.bankName && shop.bankAccount) ? `
            <div class="invoice-payment-details">
                <h5>Thanh toán chuyển khoản</h5>
                <p>Ngân hàng: <strong>${shop.bankName}</strong></p>
                <p>Số tài khoản: <strong>${shop.bankAccount}</strong></p>
                <p>Chủ tài khoản: <strong>${shop.bankOwner}</strong></p>
            </div>
        ` : `
            <div class="invoice-payment-details">
                <h5>Hình thức thanh toán</h5>
                <p>${ord.paymentMethod}</p>
            </div>
        `;

        // Render items rows
        let itemsRows = "";
        ord.items.forEach((item, idx) => {
            const amount = item.price * item.quantity;
            itemsRows += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${item.name}</td>
                    <td class="text-right">${formatCurrency(item.price)}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right"><strong>${formatCurrency(amount)}</strong></td>
                </tr>
            `;
        });

        // Notes HTML
        const notesHTML = ord.notes ? `<p style="margin-top: 15px; font-size: 12px; color: #4a4a4a; background: #f9f9f9; padding: 8px; border-radius: 4px;"><strong>Ghi chú đơn hàng:</strong> ${ord.notes}</p>` : "";

        // Build entire document
        printArea.innerHTML = `
            <div class="invoice-print-container">
                <div class="invoice-header">
                    <div class="invoice-store-info">
                        <h4>${shop.name}</h4>
                        <p>📍 ${shop.address}</p>
                        <p>📞 SĐT: ${shop.phone} ${shop.email ? '• ✉️ Email: ' + shop.email : ''}</p>
                        ${shop.website ? '<p>🌐 Website: ' + shop.website + '</p>' : ''}
                    </div>
                    <div class="invoice-title-block">
                        <h3>HÓA ĐƠN BÁN HÀNG</h3>
                        <p>Mã HĐ: <strong>${ord.id}</strong></p>
                        <p>Ngày lập: ${formatDateTime(ord.orderDate)}</p>
                    </div>
                </div>

                <div class="invoice-meta-grid">
                    <div class="invoice-bill-to">
                        <h5>Khách hàng</h5>
                        <p>Họ tên: <strong>${ord.customerName}</strong></p>
                        <p>Số điện thoại: <strong>${ord.customerPhone}</strong></p>
                        <p>Địa chỉ nhận: ${salesDb.customers.find(c => c.id === ord.customerId)?.address || 'N/A'}</p>
                    </div>
                    ${bankInfoHTML}
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">STT</th>
                            <th>Tên sản phẩm</th>
                            <th class="text-right" style="width: 120px;">Đơn giá</th>
                            <th class="text-right" style="width: 70px;">SL</th>
                            <th class="text-right" style="width: 130px;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="invoice-summary-block">
                    <table class="invoice-summary-table">
                        <tr>
                            <td>Cộng tiền hàng:</td>
                            <td class="text-right">${formatCurrency(ord.subtotal)}</td>
                        </tr>
                        ${ord.discount > 0 ? `
                        <tr>
                            <td>Giảm giá:</td>
                            <td class="text-right" style="color: #d32f2f;">- ${formatCurrency(ord.discount)}</td>
                        </tr>` : ''}
                        <tr>
                            <td>Thuế VAT (${ord.taxRate}%):</td>
                            <td class="text-right">${formatCurrency(ord.tax)}</td>
                        </tr>
                        <tr class="total-row">
                            <td><strong>TỔNG CỘNG:</strong></td>
                            <td class="text-right"><strong>${formatCurrency(ord.total)}</strong></td>
                        </tr>
                    </table>
                </div>

                ${notesHTML}

                <div class="invoice-footer-note">
                    <p>Cảm ơn quý khách đã mua hàng của chúng tôi!</p>
                    <p style="font-size: 10px; margin-top: 5px; color: #aaa;">In trực tuyến từ Spring Suite Developer Sandbox</p>
                </div>
            </div>
        `;

        // Setup printing action in button
        const printBtn = document.getElementById("btn-print-sales-invoice");
        if (printBtn) {
            printBtn.onclick = function() {
                window.print();
            };
        }

        modal.classList.add("active");
    }

    function closeInvoiceModal() {
        document.getElementById("modal-sales-invoice-preview")?.classList.remove("active");
    }

    // ----------------------------------------------------
    // CONFIGURATION / SETTINGS
    // ----------------------------------------------------
    function renderSettings() {
        const shop = salesDb.storeInfo;
        if (!shop) return;

        const setValue = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== undefined ? val : "";
        };

        setValue("sales-shop-name", shop.name);
        setValue("sales-shop-address", shop.address);
        setValue("sales-shop-phone", shop.phone);
        setValue("sales-shop-email", shop.email);
        setValue("sales-shop-web", shop.website);
        setValue("sales-shop-bank", shop.bankName);
        setValue("sales-shop-account", shop.bankAccount);
        setValue("sales-shop-owner", shop.bankOwner);
        setValue("sales-shop-tax", shop.taxRate);
        setValue("sales-shop-currency", shop.currency);
    }

    function saveSettings() {
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : "";
        };

        salesDb.storeInfo = {
            name: getValue("sales-shop-name") || "GreyTiger Suite Store",
            address: getValue("sales-shop-address"),
            phone: getValue("sales-shop-phone"),
            email: getValue("sales-shop-email"),
            website: getValue("sales-shop-web"),
            bankName: getValue("sales-shop-bank"),
            bankAccount: getValue("sales-shop-account"),
            bankOwner: getValue("sales-shop-owner"),
            taxRate: parseInt(getValue("sales-shop-tax")) || 0,
            currency: getValue("sales-shop-currency") || "đ"
        };

        saveData();
        renderAll();
        showToast("Đã lưu thông tin cấu hình cửa hàng thành công!");
    }

    // ----------------------------------------------------
    // TOAST NOTIFICATIONS (Matches general design system)
    // ----------------------------------------------------
    function showToast(message) {
        // Try to search if there's a toast container, or build one
        let container = document.getElementById("sales-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "sales-toast-container";
            container.style.position = "fixed";
            container.style.bottom = "24px";
            container.style.right = "24px";
            container.style.zIndex = "2000";
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "8px";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = "panel";
        toast.style.padding = "12px 20px";
        toast.style.background = "rgba(17, 24, 39, 0.9)";
        toast.style.backdropFilter = "blur(12px)";
        toast.style.border = "1px solid rgba(16, 185, 129, 0.3)";
        toast.style.boxShadow = "0 8px 16px rgba(0,0,0,0.5)";
        toast.style.color = "#ffffff";
        toast.style.fontSize = "13px";
        toast.style.fontWeight = "500";
        toast.style.borderRadius = "8px";
        toast.style.display = "flex";
        toast.style.alignItems = "center";
        toast.style.gap = "10px";
        toast.style.transform = "translateY(20px)";
        toast.style.opacity = "0";
        toast.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

        toast.innerHTML = `
            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #10b981; stroke-width: 2.5; fill: none;">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Animation in
        setTimeout(() => {
            toast.style.transform = "translateY(0)";
            toast.style.opacity = "1";
        }, 10);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = "translateY(-10px)";
            toast.style.opacity = "0";
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Export public APIs to window for inline HTML onclick handlers
    window.SalesApp = {
        init,
        openProductModal,
        closeProductModal,
        deleteProduct,
        openCustomerModal,
        closeCustomerModal,
        deleteCustomer,
        openOrderCreator,
        closeOrderCreator,
        updateCartQty,
        removeFromCart,
        viewOrderInvoice,
        closeInvoiceModal,
        changeOrderStatus
    };

    // Run init on DOM Ready (safeguard)
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
