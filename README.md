# Mini Asistente de Preguntas y Respuestas (Q&A)

## Descripción
Este proyecto es una aplicación de preguntas y respuestas que utiliza Docker para contenerizar el backend y el frontend. La aplicación permite a los usuarios cargar 
documentos (PDF y TXT), realizar búsquedas en su contenido y obtener respuestas a preguntas basadas en los documentos cargados.

## Instrucciones de ejecución
Para ejecutar el proyecto localmente, sigue estos pasos:

### 1. Clonar el repositorio:
```bash
git clone https://github.com/carloscabani/Mini-Asistente-de-Q-A
````

### 2. Construir y levantar el proyecto con Docker

Asegúrate de tener Docker y Docker Compose instalados en tu máquina. Ejecuta el siguiente comando en la raíz del proyecto para levantar los contenedores de frontend y backend:

```bash
docker-compose up --build
```

Esto construirá las imágenes de los contenedores y levantará los servicios. El frontend estará disponible en [http://localhost:3000](http://localhost:3000) y el backend en [http://localhost:8080](http://localhost:8080).

### 3. Detener los contenedores

Si necesitas detener los contenedores en cualquier momento, ejecuta:

```bash
docker-compose down
```

## Tiempo invertido

El tiempo total invertido en el desarrollo de esta aplicación fue de **17 horas**.

## Decisiones técnicas y supuestos

* **Docker**: Se decidió usar Docker para contenerizar tanto el frontend como el backend, asegurando un entorno consistente y fácil de desplegar. Docker Compose se utiliza para gestionar la interconexión de los servicios.
* **Frontend y Backend**: El frontend está desarrollado con React y el backend con Node.js utilizando Express.
* **PDF Parsing**: Se utilizó pdfjs-dist para la extracción de texto desde archivos PDF, debido a su mejor capacidad de manejo de PDFs en comparación con otras librerías.
* **CORS**: El backend tiene CORS habilitado para permitir las solicitudes desde el frontend que corre en un contenedor separado.

## Resumen de problemas y soluciones

### 1. Problemas con la lectura de PDFs

**Problema**: Errores con pdf-parse, importaciones fallidas con pdfjs-dist, búsquedas insensibles a mayúsculas/tildes y fragmentos incorrectos.
**Solución**: Se migró a pdfjs-dist, se ajustaron las versiones e importaciones. Se implementó una función de normalización y expresiones regulares para hacer las búsquedas más precisas y se corrigió la lógica de extracción de fragmentos.

### 2. Problemas con la ejecución de Docker

**Problema**: El frontend no se comunicaba con el backend porque usaba localhost en lugar de la URL del servicio de Docker.
**Solución**: Se actualizó la URL en el archivo `qaService.tsx` para que apunte al servicio backend (`http://backend:8080/api`) en lugar de localhost.

### 3. Duplicación de archivos

**Problema**: Al subir archivos .txt con el mismo nombre, el sistema creaba duplicados.
**Solución**: Se modificó la configuración de multer para verificar si un archivo con el mismo nombre ya existía, evitando así los duplicados.

### 4. Falta de manejo de errores en la interfaz

**Problema**: Los errores no se mostraban en la interfaz de usuario, solo en la consola.
**Solución**: Se implementó un manejo de errores en los componentes de React (Uploader, Search y QA), mostrando mensajes claros al usuario cuando ocurría un fallo.

## Video de la aplicación

A continuación, se incluye un video del funcionamiento de la aplicación:

![Mini Asistente de Preguntas y Respuestas](https://youtu.be/9aHvZNZrlzA)

