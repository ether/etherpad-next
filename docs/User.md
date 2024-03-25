# User Documentation

This documenation is for Etherpad-next collaborator.

## How to run Etherpad-next

**requirements:**

- Node.js
- npm
- Docker (optional)
- Postgres or mysql (Postgres is recommended and default)
- Have filled the .env file
- Have setup the settings of app

### Run the app

**Using docker-compose:**

```bash
docker compose up -d
docker compose exec app npm i
docker compose exec app npx prisma db push
docker compose exec app npx turbo build
docker compose exec app npm run start
```

**Using own machine:**

> [!IMPORTANT]\
> You need to have a postgres database running on your machine.

````bash
npm i
npx prisma db push
npx turbo build
npm run start```


## How to setup the settings of app

Create a `settings.json` file on roots of the project.

```json
{
  "$schema": "./settings.schema.json"
}
````
