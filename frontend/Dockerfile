FROM node:18-alpine AS builder

# Argument para la URL del API
ARG REACT_APP_API_URL=http://localhost:8080

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Configurar variable de entorno para el build
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuración personalizada de nginx si es necesario
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]