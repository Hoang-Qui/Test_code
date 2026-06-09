// Mã nguồn trước khi tối ưu hóa - Hệ thống Inventory AI
function processOrder(uId, cartItems, cCode, pMethod) {
    let total = 0;
    let dbUser = db.query("SELECT * FROM users WHERE id = " + uId);

    if (dbUser != null) {
        if (dbUser.status === 'active') {
            if (cartItems != null && cartItems.length > 0) {
                for (let i = 0; i < cartItems.length; i++) {

                    let p = db.query("SELECT * FROM products WHERE id = " + cartItems[i].id);
                    if (p != null) {
                        if (p.stock >= cartItems[i].qty) {
                            let itemPrice = p.price;
                            if (cartItems[i].qty >= 10) {
                                itemPrice = itemPrice * 0.9; // Giảm giá 10% nếu mua số lượng lớn
                            }
                            total += itemPrice * cartItems[i].qty;
                        } else {
                            throw new Error("San pham " + p.name + " khong du hang ton kho!");
                        }
                    } else {
                        throw new Error("San pham khong ton tai!");
                    }
                }

                // Kiểm tra phân hạng khách hàng để giảm giá
                if (dbUser.rank === 'VIP') {
                    total = total * 0.85; // Giảm 15% cho VIP
                } else if (dbUser.rank === 'Partner') {
                    total = total * 0.80; // Giảm 20% cho Partner
                }

                // Áp dụng mã coupon toàn quốc
                if (cCode != null && cCode != "") {
                    let cp = db.query("SELECT * FROM coupons WHERE code = '" + cCode + "'");
                    if (cp != null && cp.isValid === true) {
                        total = total - cp.value;
                    }
                }

                // Tính thuế VAT và phí vận chuyển
                total = total * 1.1; // +10% VAT
                if (pMethod === 'COD') {
                    total += 30000; // Phí ship COD
                }

                // Cập nhật kho hàng hóa
                for (let i = 0; i < cartItems.length; i++) {
                    db.execute(
                        "UPDATE products SET stock = stock - " +
                        cartItems[i].qty +
                        " WHERE id = " +
                        cartItems[i].id
                    );
                }

                // Tạo bản ghi hóa đơn
                let invId = db.execute(
                    "INSERT INTO invoices (user_id, total, status) VALUES (" +
                    uId + ", " + total + ", 'PAID')"
                );

                return {
                    success: true,
                    invoiceId: invId,
                    amount: total
                };
            } else {
                return {
                    success: false,
                    message: "Gio hang trong"
                };
            }
        } else {
            return {
                success: false,
                message: "Tai khoan bi khoa"
            };
        }
    } else {
        return {
            success: false,
            message: "Nguoi dung khong ton tai"
        };
    }
}