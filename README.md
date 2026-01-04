## Run `TEST` enviroment

```bash
docker compose --profile test up --build --abort-on-container-exit
```

## Run `DEV` enviroment

```bash
docker compose --profile dev up --build
```

after run `docker compose down -v` to remove volumes

## Run `PROD` enviroment

```bash
docker compose --profile prod up --build
```

Or use `-d` flag to run in detached mode

```bash
docker compose --profile prod up -d --build
```
