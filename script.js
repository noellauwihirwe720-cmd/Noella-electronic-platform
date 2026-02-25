// script.js - Main E-commerce Functionality

// Global variables
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    updateCartCount();
    startCountdown();
    updateDateTime();
    setupSearch();
    
    // Load featured products
    displayFeaturedProducts();
});

// Load products from Firebase
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        products = [];
        snapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

// Display featured products
function displayFeaturedProducts() {
    const grid = document.getElementById('featuredProducts');
    if (!grid) return;
    
    const featured = products.slice(0, 8); // Show first 8 products
    
    grid.innerHTML = featured.map(product => `
        <div class="product-card">
            <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">$${product.price.toFixed(2)}</p>
                <p class="product-stock">${product.quantity > 0 ? 'In Stock' : 'Out of Stock'}</p>
                <button class="add-to-cart" 
                        onclick="addToCart('${product.id}')"
                        ${product.quantity === 0 ? 'disabled' : ''}>
                    Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

// Add to cart
async function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    
    if (!product || product.quantity === 0) {
        showNotification('Product out of stock', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.quantity) {
            existingItem.quantity++;
        } else {
            showNotification('Not enough stock', 'warning');
            return;
        }
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxQuantity: product.quantity,
            image: product.imageUrl
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('Added to cart!', 'success');
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

// View cart modal
function viewCart() {
    const modal = document.getElementById('cartModal');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Your cart is empty</p>';
        cartTotal.textContent = '0.00';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <h4>${item.name}</h4>
                    <p>$${item.price.toFixed(2)} each</p>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <p>$${(item.price * item.quantity).toFixed(2)}</p>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = total.toFixed(2);
    }
    
    modal.style.display = 'block';
}

// Update quantity in cart
function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    const product = products.find(p => p.id === productId);
    
    if (!item || !product) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity === 0) {
        cart = cart.filter(i => i.id !== productId);
    } else if (newQuantity > 0 && newQuantity <= product.quantity) {
        item.quantity = newQuantity;
    } else {
        showNotification('Maximum stock reached', 'warning');
        return;
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    viewCart(); // Refresh modal
}

// Checkout
async function checkout() {
    if (cart.length === 0) {
        showNotification('Cart is empty', 'error');
        return;
    }
    
    try {
        // Create order in Firebase
        const order = {
            items: cart,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            status: 'pending',
            customerEmail: prompt('Enter your email for confirmation:'),
            customerName: prompt('Enter your name:'),
            customerPhone: prompt('Enter your phone number:'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (!order.customerEmail || !order.customerName) {
            showNotification('Checkout cancelled', 'error');
            return;
        }
        
        // Save order to Firestore
        const orderRef = await db.collection('orders').add(order);
        
        // Update product quantities
        for (const item of cart) {
            const productRef = db.collection('products').doc(item.id);
            const product = products.find(p => p.id === item.id);
            await productRef.update({
                quantity: product.quantity - item.quantity
            });
        }
        
        // Send email notifications
        await sendOrderEmails(order, orderRef.id);
        
        // Clear cart
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        
        // Close modal
        document.getElementById('cartModal').style.display = 'none';
        
        showNotification('Order placed! Check your email for confirmation.', 'success');
        
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Error placing order', 'error');
    }
}

// Send order emails
async function sendOrderEmails(order, orderId) {
    // Send email to customer
    await emailjs.send('YOUR_SERVICE_ID', 'YOUR_CUSTOMER_TEMPLATE', {
        to_email: order.customerEmail,
        customer_name: order.customerName,
        order_id: orderId,
        order_total: order.total.toFixed(2),
        order_items: JSON.stringify(order.items)
    });
    
    // Send email to admin (you)
    await emailjs.send('YOUR_SERVICE_ID', 'YOUR_ADMIN_TEMPLATE', {
        to_email: ADMIN_EMAIL,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        order_id: orderId,
        order_total: order.total.toFixed(2),
        order_items: JSON.stringify(order.items)
    });
}

// Countdown timer
function startCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;
    
    const endTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours from now
    
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance < 0) {
            clearInterval(timer);
            countdownEl.innerHTML = "SALE ENDED";
            return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        countdownEl.innerHTML = `${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// Update date and time
function updateDateTime() {
    const dtEl = document.getElementById('currentDateTime');
    if (!dtEl) return;
    
    const update = () => {
        const now = new Date();
        dtEl.textContent = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        }) + ' • ' + now.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    };
    
    update();
    setInterval(update, 1000);
}

// Search products
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
}

function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    window.location.href = `products.html?search=${encodeURIComponent(term)}`;
}

// Show notification
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#f39c12'};
        color: white;
        border-radius: 5px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Close modal when clicking X
document.querySelector('.close')?.addEventListener('click', () => {
    document.getElementById('cartModal').style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('cartModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});