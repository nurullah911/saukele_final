FROM nginx:alpine

RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/index.html
COPY config.js /usr/share/nginx/html/config.js
COPY docker-entrypoint.d/ /docker-entrypoint.d/

RUN sed -i 's/\r$//' /docker-entrypoint.d/*.sh && chmod +x /docker-entrypoint.d/*.sh

EXPOSE 80

CMD ["/bin/sh", "-c", "envsubst '${NGINX_API_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
