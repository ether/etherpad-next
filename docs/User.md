# User Documentation

This documenation is for Etherpad-next collaborator.

## How to run Etherpad-next

**requirements:**

- Node.js
- npm
- MySQL
- Have filled the .env file
- Have setup the settings of app

```
npm i
npx prisma migrate dev
npx turbo build
npx turbo start
```

## How to setup the settings of app

Create a `settings.json` file on roots of the project.

```json
{
  "$schema": "./settings.schema.json"
}
```
