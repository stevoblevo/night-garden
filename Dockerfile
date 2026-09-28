FROM python:3.13-alpine
WORKDIR /app
COPY server.py /app/server.py
COPY site/ /app/site/
USER 65532:65532
EXPOSE 8080
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
CMD ["python3", "-B", "/app/server.py", "--root", "/app/site", "--port", "8080"]
