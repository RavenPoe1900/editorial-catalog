Ejecución del Proyecto
Para iniciar el proyecto, puedes utilizar varios scripts que se encuentran definidos en el package.json. A continuación, se describen las diferentes opciones:

npm start
Este comando ejecuta el proyecto utilizando nodemon para reiniciar automáticamente el servidor cada vez que se detecten cambios en los archivos. Además, se limpia la consola antes de reiniciar, lo que facilita la lectura de los logs.

Inicio del servidor en modo depuración:

npm run inspect
Este script ejecuta el servidor con nodemon y habilita la inspección de código utilizando las herramientas de desarrollo de Node.js. Es útil para depurar el código y encontrar posibles errores.

Estructura del Proyecto y Decisiones de Diseño
Este proyecto ha sido desarrollado siguiendo las mejores prácticas en Node.js y Express, con un enfoque en la modularidad, escalabilidad, y mantenibilidad. A continuación, se describe la estructura del proyecto y las decisiones clave de diseño:

El directorio _shared agrupa todos los componentes reutilizables del proyecto, lo que permite centralizar configuraciones y funciones que se aplican en diversas partes de la aplicación. Dentro de este directorio, encontrarás:

Configuración: Aquí se define la configuración global del proyecto, incluyendo la conexión a la base de datos y otros parámetros esenciales.
Middlewares: Middlewares reutilizables que son aplicados en diferentes rutas de la aplicación, ayudando a mantener la coherencia y reducir la repetición de código.
Enumeraciones: Constantes y enumeraciones utilizadas a lo largo del proyecto, facilitando la gestión de valores constantes y evitando errores tipográficos.
Swagger: Configuración para la autodetección de archivos de rutas y la generación automática de la documentación de la API, lo que garantiza que la documentación esté siempre sincronizada con el código.
application
El directorio application alberga la lógica de negocio del proyecto, organizada en servicios. Estos servicios son responsables de gestionar las interacciones con los modelos de datos y contienen la lógica central de la aplicación. Esta separación permite mantener los controladores ligeros, enfocados exclusivamente en la gestión de las solicitudes HTTP, y facilita la reutilización de la lógica de negocio en diferentes contextos.

domain
El directorio domain está organizado por modelo, lo que permite mantener una estructura modular y coherente. Cada modelo tiene su propio subdirectorio, que contiene:

DTOs: Objetos de Transferencia de Datos definidos con Joi, utilizados para validar las entradas y garantizar que los datos cumplan con los requisitos del negocio.
Esquemas de Mongoose: Definiciones de los modelos de la base de datos, incluyendo las relaciones entre diferentes entidades.
Swagger: Documentación específica para cada modelo, lo que facilita la comprensión de la API y su uso por parte de otros desarrolladores.
Populate: Configuración de relaciones y población de datos entre modelos, optimizando las consultas y la gestión de datos relacionados.
infrastructure
El directorio infrastructure contiene los controladores y las rutas de la aplicación. Los controladores son responsables de manejar las solicitudes HTTP entrantes y delegar la lógica de negocio a los servicios correspondientes. Esta separación clara entre las capas de la aplicación permite un código más limpio y organizado, facilitando el mantenimiento y la escalabilidad del proyecto.

Este enfoque modular no solo mejora la organización del código, sino que también incrementa la productividad al permitir la reutilización de componentes y garantizar que las responsabilidades estén bien definidas y separadas.

Cómo Ejecutar los Tests
El proyecto incluye una serie de scripts para ejecutar los tests, los cuales están definidos en el archivo package.json:

npm test: Ejecuta todos los tests con cobertura.
npm run test:unit: Ejecuta únicamente los tests unitarios.
npm run test:integration: Ejecuta únicamente los tests de integración.
npm run test:watch: Ejecuta los tests en modo de observación, reiniciándose automáticamente al detectar cambios.
npm run test:ci: Ejecuta los tests en un entorno de integración continua, generando un reporte de cobertura.
npm run test:verbose: Ejecuta los tests con un mayor nivel de detalle en los resultados.

