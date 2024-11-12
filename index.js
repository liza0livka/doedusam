import { fetchProductHistory, getAllProducts as fetchProducts, createProduct, updateProduct, deleteProduct } from './api.js';

// Получение элементов DOM
const toggleSwitch = document.querySelector("#toggle-dark-mode");
const productList = document.querySelector("#product-list");
const searchInput = document.querySelector("#search-input");
const filterSelect = document.querySelector("#filter-select");
const sortSelect = document.querySelector("#sort-select");
const addForm = document.getElementById('add-product-form');
const editForm = document.getElementById('edit-product-form');
const overlay = document.getElementById('overlay');
const saveButton = document.getElementById("save-product-button");
const addButton = document.getElementById("add-product-toggle");
const addFormButton = document.getElementById("add-product-button");

let allProducts = [];
let filteredProducts = [];
let isEditMode = false;
let currentProductId = null;
let showingHistoryFor = null;

// Установка обработчиков событий
toggleSwitch.addEventListener("click", handleToggleDarkMode);
searchInput.addEventListener("input", handleSearchInput);
filterSelect.addEventListener("change", handleFilterChange);
sortSelect.addEventListener("change", handleSortChange);
saveButton.addEventListener("click", handleSaveProduct);
addFormButton.addEventListener("click", handleAddProduct);
addButton.addEventListener("click", openAddForm);
overlay.addEventListener("click", closeForm);

async function fetchAndDisplayProducts() {
    allProducts = await fetchProducts();
    filteredProducts = allProducts;
    renderAllProducts(filteredProducts);
    populateManufacturers(allProducts);
}

function handleToggleDarkMode() {
    document.body.classList.toggle("dark-mode");
}

function handleSearchInput(event) {
    const query = event.target.value.toLowerCase();
    applyFilters(query, filterSelect.value);
}

function handleFilterChange(event) {
    const selectedManufacturer = event.target.value;
    applyFilters(searchInput.value.toLowerCase(), selectedManufacturer);
}

function applyFilters(query, selectedManufacturer) {
    filteredProducts = allProducts.filter(product => {
        const matchesQuery = product.product_name.toLowerCase().includes(query);
        const matchesManufacturer = selectedManufacturer === "all" || product.manufacturer === selectedManufacturer;
        return matchesQuery && matchesManufacturer;
    });

    renderAllProducts(filteredProducts);
    updateProductCount();
}

function handleSortChange(event) {
    const sortOrder = event.target.value;
    if (sortOrder === "none") {
        renderAllProducts(allProducts); // Показать продукты без сортировки
    } else {
        filteredProducts = [...filteredProducts].sort((a, b) => {
            const priceA = parsePrice(a.price);
            const priceB = parsePrice(b.price);
            return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        });
        renderAllProducts(filteredProducts);
    }
}

function parsePrice(priceString) {
    return parseFloat(priceString.replace(/[^\d.]/g, ''));
}

function renderOneProduct(productObj) {
    const card = document.createElement("li");
    card.className = "card animated-element";
    card.dataset.id = productObj.id;
    if (!productObj.is_active) card.classList.add("inactive");

    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <img src="${productObj.main_image}" alt="${productObj.product_name}" />
            </div>
            <div class="card-back">
                <h4>${productObj.product_name}</h4>
                <p class="description">Производитель: ${productObj.manufacturer}</p>
                <p class="price">${productObj.price}</p>
                <div class="button-container">
                    <button class="button edit-button" onclick="openEditForm(${productObj.id})">Редактировать</button>
                    <button class="button delete-button" onclick="deleteProductHandler(${productObj.id})">Удалить</button>
                    <button class="button history-button" onclick="toggleHistoryCard(${productObj.id}, '${productObj.product_name}')">История</button>
                </div>
            </div>
        </div>
    `;
    productList.append(card);
}

function renderAllProducts(productData) {
    productList.innerHTML = '';
    productData.forEach(renderOneProduct);
    updateProductCount();
}

function updateProductCount() {
    document.getElementById('product-count').textContent = `${filteredProducts.length} из ${allProducts.length}`;
}

function populateManufacturers(products) {
    const manufacturers = Array.from(new Set(products.map(p => p.manufacturer)));
    filterSelect.innerHTML = '<option value="all">Все элементы</option>';
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer;
        option.textContent = manufacturer;
        filterSelect.appendChild(option);
    });
}

// Функция для переключения между карточкой товара и карточкой истории
async function toggleHistoryCard(productId, productName) {
    const productCard = document.querySelector(`li[data-id="${productId}"]`);
    
    if (showingHistoryFor === productId) {
        // Если уже отображается история, вернуться к карточке товара
        showingHistoryFor = null;
        renderAllProducts(filteredProducts); // Перерисовываем весь список продуктов
    } else {
        // Включить отображение истории
        showingHistoryFor = productId;
        
        const history = await fetchProductHistory();
        const productHistory = history.filter(entry => entry.product === productName);
        
        productCard.innerHTML = `
            <div class="card-inner history-card">
                <h4>История покупок</h4>
                <ul class="history-list">
                    ${
                        productHistory.length > 0 
                        ? productHistory.map(entry => `<li>Дата: ${new Date(entry.sale_datetime).toLocaleString()}, Количество: ${entry.quantity}</li>`).join("")
                        : "<li>История товара не найдена</li>"
                    }
                </ul>
                <div class="button-container">
                    <button class="button history-button" onclick="toggleHistoryCard(${productId}, '${productName}')">Назад к товару</button>
                </div>
            </div>
        `;
    }
}


// Функция для заполнения выпадающего списка производителей
function populateManufacturerDropdown(selectElementId, selectedManufacturer) {
    const selectElement = document.getElementById(selectElementId);
    selectElement.innerHTML = ''; // Очистка перед добавлением

    const manufacturers = Array.from(new Set(allProducts.map(p => p.manufacturer)));
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer;
        option.textContent = manufacturer;
        if (manufacturer === selectedManufacturer) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

function handleAddProduct() {
    // Получаем значения полей формы
    const productName = document.getElementById('new-product-name').value.trim();
    const productImage = document.getElementById('new-product-image').value.trim();
    const manufacturer = document.getElementById('new-product-manufacturer').value.trim();
    const price = document.getElementById('new-product-price').value.trim();
    const isActive = document.getElementById('product-status').checked;

    // Проверяем, заполнены ли все обязательные поля
    if (!productName || !productImage || !manufacturer || !price) {
        alert("Пожалуйста, заполните все поля.");
        return; // Прекращаем выполнение функции, если данные не введены
    }

    // Проверка: цена должна быть числом больше нуля
    if (isNaN(price) || Number(price) <= 0) {
        alert("Введите корректную цену (число больше нуля).");
        return; // Прекращаем выполнение функции, если цена некорректна
    }

    // Определяем максимальный ID среди существующих продуктов
    const maxId = allProducts.length > 0 ? Math.max(...allProducts.map(p => p.id)) : 0;

    const productData = {
        id: maxId + 1, // Новый уникальный числовой ID
        product_name: productName,
        main_image: productImage,
        manufacturer: manufacturer,
        price: price + " руб.",
        is_active: isActive // Читаем статус из чекбокса
    };

    // Добавляем новый продукт в базу данных
    createProduct(productData).then(() => {
        allProducts.push(productData);
        renderAllProducts(allProducts);
        closeForm();
    });
}





function handleSaveProduct() {
    if (!currentProductId) {
        console.error("No product selected for editing.");
        return;
    }

    // Найдите продукт по ID
    const product = allProducts.find(p => String(p.id) === String(currentProductId));
    
    if (!product) {
        console.error(`Product with ID ${currentProductId} not found.`);
        return;
    }

    // Обновите данные продукта из формы
    const updatedData = {
        product_name: document.getElementById('edit-product-name').value,
        main_image: document.getElementById('edit-product-image').value,
        manufacturer: document.getElementById('edit-product-manufacturer').value,
        price: document.getElementById('edit-product-price').value + " руб.",
        is_active: document.getElementById('edit-product-status').checked
    };

    // Объедините изменения с существующими данными продукта
    Object.assign(product, updatedData);

    // Отправьте изменения на сервер
    updateProduct(currentProductId, updatedData)
        .then(() => {
            renderAllProducts(allProducts); // Перерисуйте список продуктов
            closeForm(); // Закройте форму
        })
        .catch(error => {
            console.error("Error updating product:", error);
        });
}



function openAddForm() {
    populateManufacturerDropdown('new-product-manufacturer');
    addForm.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function openEditForm(productId) {
    // Преобразуем ID продукта к строке для корректного поиска
    const product = allProducts.find(p => String(p.id) === String(productId));

    if (!product) {
        console.error(`Product with ID ${productId} not found.`);
        return;
    }

    // Заполнение формы данными продукта
    currentProductId = productId;
    document.getElementById('edit-product-name').value = product.product_name;
    document.getElementById('edit-product-image').value = product.main_image;
    document.getElementById('edit-product-price').value = parsePrice(product.price);
    populateManufacturerDropdown('edit-product-manufacturer', product.manufacturer);
    document.getElementById('edit-product-status').checked = product.is_active;

    isEditMode = true;
    editForm.classList.remove('hidden');
    overlay.classList.remove('hidden');
}



async function deleteProductHandler(productId) {
    try {
        // Удаление продукта из базы данных
        await deleteProduct(productId);
        
        // Удаление из локального списка
        allProducts = allProducts.filter(product => product.id !== productId);
        filteredProducts = filteredProducts.filter(product => product.id !== productId);
        
        // Обновление отображения
        renderAllProducts(filteredProducts);
        updateProductCount();
    } catch (error) {
        console.error("Ошибка при удалении продукта:", error);
    }
}


function closeForm() {
    addForm.classList.add('hidden');
    editForm.classList.add('hidden');
    overlay.classList.add('hidden');
    isEditMode = false;
    currentProductId = null;
}

// Инициализация
function initialize() {
    fetchAndDisplayProducts();
}

// Экспорт функций для использования в HTML
window.toggleHistoryCard = toggleHistoryCard;
window.openAddForm = openAddForm;
window.openEditForm = openEditForm;
window.closeForm = closeForm;
window.deleteProductHandler = deleteProductHandler;

initialize();
