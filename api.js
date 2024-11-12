// Получает всю историю продуктов с сервера
export async function fetchProductHistory() {
  try {
      const response = await fetch('http://localhost:3000/productsale');
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
  } catch (error) {
      console.error("Failed to fetch product history:", error);
      return [];
  }
}

// Получает все продукты с сервера
export async function getAllProducts() {
  try {
      const response = await fetch("http://localhost:3000/products");
      if (!response.ok) {
          throw new Error("Failed to fetch products");
      }
      return await response.json();
  } catch (error) {
      console.error(error);
      return [];
  }
}

// Создаёт новый продукт на сервере
export function createProduct(productObj) {
  return fetch("http://localhost:3000/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productObj),
  }).then(response => response.json());
}

// Обновляет существующий продукт на сервере
export function updateProduct(id, updates) {
  return fetch(`http://localhost:3000/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
  }).then(response => {
      if (!response.ok) throw new Error("Error updating product");
      return response.json();
  });
}

// Удаляет продукт на сервере
export function deleteProduct(id) {
  return fetch(`http://localhost:3000/products/${id}`, { method: "DELETE" })
      .then(response => response.json());
}
