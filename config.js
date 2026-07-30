/* ============================================================
   ECOCOFFIEPLANET · ARCHIVO DE CONFIGURACIÓN
   ------------------------------------------------------------
   👉 ESTE ES EL ÚNICO ARCHIVO QUE NECESITAS TOCAR
      para cambiar PRECIOS e IMÁGENES.

   ¿Cómo cambiar una imagen?
     - Pega la dirección (URL) de una imagen de internet, o
     - Guarda tu foto en la carpeta "img/" y escribe:  "img/mi-foto.jpg"

   ¿Cómo cambiar un precio?
     - Cambia el número que está en "precio".
     - Ahora están todos en 0. Cuando quieras, escribe el valor real,
       por ejemplo:  precio: 24900   →  se mostrará como  $24.900
   ============================================================ */

const CONFIG = {

  /* ---- IMAGEN DE PORTADA (fondo del inicio) ----
     Un rostro aplicándose crema / exfoliante (estilo skincare).

     👉 PARA USAR TU IMAGEN CREADA POR IA:
        1. Guarda tu imagen en la carpeta "img/" (por ejemplo: img/portada.jpg)
        2. Cambia la línea de abajo por:   heroImagen: "img/portada.jpg",
     Mientras tanto queda esta foto de skincare como ejemplo. */
  heroImagen: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1600&q=80",

  /* ---- IMÁGENES DE LAS SECCIONES ---- */
  imagenes: {
    historia:    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80", // granos de café
    inspiracion: "https://images.unsplash.com/photo-1524350876685-274059332603?auto=format&fit=crop&w=900&q=80", // cultivo de café
    porque:      "https://images.unsplash.com/photo-1515442261605-65987783cb6a?auto=format&fit=crop&w=900&q=80", // cuncho / café molido
  },

  /* ---- PRODUCTOS ----
     Cambia "nombre", "descripcion", "precio", "imagen" y "etiqueta".
     La etiqueta puede quedar vacía ("") si no quieres mostrarla. */
  productos: [
    {
      nombre: "Jabón Natural de Café",
      descripcion: "Limpieza suave con exfoliación ligera. Ideal para el uso diario.",
      precio: 0,
      imagen: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?auto=format&fit=crop&w=700&q=80",
      etiqueta: "Bestseller",
    },
    {
      nombre: "Exfoliante Corporal",
      descripcion: "Renueva la piel de todo el cuerpo con la textura del café.",
      precio: 0,
      imagen: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=80",
      etiqueta: "",
    },
    {
      nombre: "Exfoliante Facial",
      descripcion: "Fórmula delicada para el rostro, deja la piel suave y luminosa.",
      precio: 0,
      imagen: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=700&q=80",
      etiqueta: "",
    },
    {
      nombre: "Kit Natural",
      descripcion: "Jabón + exfoliante corporal + facial. El ritual completo.",
      precio: 0,
      imagen: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
      etiqueta: "Kit",
    },
    {
      nombre: "Jabón Artesanal Premium",
      descripcion: "Edición especial con aceites esenciales y cuncho seleccionado.",
      precio: 0,
      imagen: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=700&q=80",
      etiqueta: "Premium",
    },
  ],

  /* ---- GALERÍA (puedes poner las que quieras) ---- */
  galeria: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80",
  ],

  /* ---- ¿Cómo mostrar el precio 0? ----
     "$0"          → muestra el número cero
     "Próximamente"→ muestra ese texto en vez del precio
     Cambia el texto entre comillas si prefieres otra cosa. */
  textoPrecioCero: "$0",
};
