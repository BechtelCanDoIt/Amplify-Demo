# Menu App API

## Overview

This API provides functionality to retrieve a list of menu items for various meals. You can access the menu items by sending a GET request to the `/menu` endpoint.

## Installation Guide

- Clone this repository [here](https://github.com/wso2-enterprise/digiops-hr/tree/main).
- The main branch is the most stable branch at any given time, ensure you're working from it.
- Direct to the following folder [apps -> menu-app -> business-service]
- Run bal build to install all dependencies
- You will have to setup and use your locally installed MySQL database. Do add the dump to your local machine provided under the resources folder.
- Add a config.toml file to the project root folder and add the desired configurations. See config.local.toml for assistance.

## Usage

- Run `bal run` to start the application.
- Connect to the API using Postman on port 9090.

## API Base URL

```plaintext
{server}:{port}/
```

- **server:** Default is `http://localhost`
- **port:** Default is `9090`

## Paths

### 1. Retrieve Menu Items

- **Endpoint:** `/menu`
- **Method:** `GET`
- **Summary:** Retrieve a list of menu items.

##### Responses:

<table>
<tr>
<td><b>Code</b></td>
<td><b>Description</b></td>
</tr>
<tr>
<td> 200 </td>
<td> Ok <br/>

```json
{
  "date": "2026-01-10",
  "breakfast": {
    "title": "Vegetarian Omelette",
    "description": "A healthy and delicious vegetarian omelette."
  },
  "juice": {
    "title": "Orange Juice",
    "description": "Freshly squeezed orange juice."
  },
  "lunch": {
    "title": "Grilled Chicken Salad",
    "description": "A tasty and nutritious grilled chicken salad."
  },
  "dessert": {
    "title": "Chocolate Mousse",
    "description": "Rich and creamy chocolate mousse for dessert."
  },
  "snack": {
    "title": "Mixed Nuts",
    "description": "A mix of assorted nuts for a quick snack."
  }
}
```

</td>
</tr>
<tr>
<td> 500 </td>
<td> InternalServerError </td>
</tr>
</table>
