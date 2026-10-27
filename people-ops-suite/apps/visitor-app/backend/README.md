# Visitor & Visits Management API

## Version: 1.0.0

**Base URL:** `{server}:{port}/`  
**Default:** `http://localhost:9090/`

---

## Endpoints

### 1. Get Logged-in User Info

**GET** `/user-info`

**Summary:** Fetch logged-in user's details.

**Responses:**

| Status | Description         | Schema                |
| ------ | ------------------- | --------------------- |
| 200    | OK                  | [UserInfo](#userinfo) |
| 500    | InternalServerError | -                     |

**Sample Response (200):**

```json
{
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "workEmail": "john.doe@example.com",
  "jobRole": "Software Engineer",
  "employeeThumbnail": null,
  "privileges": [101, 102, 103]
}
```

---

### 2. Get Visitor by Hashed NIC

**GET** `/visitors/{hashedNic}`

**Parameters:**

| Name      | In   | Description                  | Required | Type   |
| --------- | ---- | ---------------------------- | -------- | ------ |
| hashedNic | path | Hashed NIC number of visitor | true     | string |

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 200    | OK                  | [Visitor](#visitor)           |
| 400    | BadRequest          | [ErrorPayload](#errorpayload) |
| 404    | NotFound            | -                             |
| 500    | InternalServerError | -                             |

**Sample Response (200):**

```json
{
  "nicHash": "abc123hash",
  "name": "Alice Smith",
  "nicNumber": "123456789V",
  "contactNumber": "+94112223344",
  "email": "alice.smith@example.com",
  "createdBy": "admin",
  "createdOn": "2025-08-31T10:00:00",
  "updatedBy": "admin",
  "updatedOn": "2025-08-31T10:00:00"
}
```

---

### 3. Create a New Visitor

**POST** `/visitors`

**Request Body Example:**

```json
{
  "nicHash": "xyz789hash",
  "name": "Bob Johnson",
  "nicNumber": "987654321V",
  "contactNumber": "+94115556677",
  "email": "bob.johnson@example.com"
}
```

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 201    | Created             | -                             |
| 400    | BadRequest          | [ErrorPayload](#errorpayload) |
| 500    | InternalServerError | -                             |

**Sample Error (400):**

```json
{
  "timestamp": "2025-08-31T10:05:00Z",
  "status": 400,
  "reason": "BadRequest",
  "message": "NIC number already exists",
  "path": "/visitors",
  "method": "POST"
}
```

---

### 4. Get Visits

**GET** `/visits?limit=10&offset=0`

**Sample Response (200):**

```json
{
  "totalCount": 2,
  "visits": [
    {
      "id": 1,
      "name": "Alice Smith",
      "nicNumber": "123456789V",
      "contactNumber": "+94112223344",
      "email": "alice.smith@example.com",
      "companyName": "ABC Corp",
      "passNumber": "P001",
      "whomTheyMeet": "John Doe",
      "purposeOfVisit": "Business Meeting",
      "accessibleLocations": [{ "floor": "5", "rooms": ["501", "502"] }],
      "timeOfEntry": "2025-08-31T09:00:00Z",
      "timeOfDeparture": "2025-08-31T12:00:00",
      "createdBy": "admin",
      "createdOn": "2025-08-31T08:00:00",
      "updatedBy": "admin",
      "updatedOn": "2025-08-31T08:30:00"
    }
  ]
}
```

---

### 5. Create a New Visit

**POST** `/visits`

**Request Body Example:**

```json
{
  "nicHash": "abc123hash",
  "companyName": "XYZ Ltd",
  "passNumber": "P002",
  "whomTheyMeet": "Jane Doe",
  "purposeOfVisit": "Interview",
  "accessibleLocations": [{ "floor": "3", "rooms": ["301", "302"] }],
  "timeOfEntry": "2025-08-31T14:00:00",
  "timeOfDeparture": "2025-08-31T16:00:00"
}
```

**Sample Response (201):**

- Status: Created
- Empty body

**Sample Error (400):**

```json
{
  "timestamp": "2025-08-31T13:55:00Z",
  "status": 400,
  "reason": "BadRequest",
  "message": "Time of entry cannot be in the past",
  "path": "/visits",
  "method": "POST"
}
```

---

## Schemas

### Floor

```json
{
  "floor": "5",
  "rooms": ["501", "502"]
}
```

### AddVisitPayload

```json
{
  "nicHash": "abc123hash",
  "companyName": "ABC Corp",
  "passNumber": "P001",
  "whomTheyMeet": "John Doe",
  "purposeOfVisit": "Business Meeting",
  "accessibleLocations": [{ "floor": "5", "rooms": ["501", "502"] }],
  "timeOfEntry": "2025-08-31T09:00:00",
  "timeOfDeparture": "2025-08-31T12:00:00"
}
```

### AddVisitorPayload

```json
{
  "nicHash": "abc123hash",
  "name": "Alice Smith",
  "nicNumber": "123456789V",
  "contactNumber": "+94112223344",
  "email": "alice.smith@example.com"
}
```

### Visitor

```json
{
  "nicHash": "abc123hash",
  "name": "Alice Smith",
  "nicNumber": "123456789V",
  "contactNumber": "+94112223344",
  "email": "alice.smith@example.com",
  "createdBy": "admin",
  "createdOn": "2025-08-31T10:00:00",
  "updatedBy": "admin",
  "updatedOn": "2025-08-31T10:00:00"
}
```

### Visit

```json
{
  "id": 1,
  "name": "Alice Smith",
  "nicNumber": "123456789V",
  "contactNumber": "+94112223344",
  "email": "alice.smith@example.com",
  "companyName": "ABC Corp",
  "passNumber": "P001",
  "whomTheyMeet": "John Doe",
  "purposeOfVisit": "Business Meeting",
  "accessibleLocations": [{ "floor": "5", "rooms": ["501", "502"] }],
  "timeOfEntry": "2025-08-31T09:00:00",
  "timeOfDeparture": "2025-08-31T12:00:00",
  "createdBy": "admin",
  "createdOn": "2025-08-31T08:00:00",
  "updatedBy": "admin",
  "updatedOn": "2025-08-31T08:30:00"
}
```

### VisitsResponse

```json
{
  "totalCount": 1,
  "visits": [
    {
      "id": 1,
      "name": "Alice Smith",
      "nicNumber": "123456789V",
      "contactNumber": "+94112223344",
      "email": "alice.smith@example.com",
      "companyName": "ABC Corp",
      "passNumber": "P001",
      "whomTheyMeet": "John Doe",
      "purposeOfVisit": "Business Meeting",
      "accessibleLocations": [{ "floor": "5", "rooms": ["501", "502"] }],
      "timeOfEntry": "2025-08-31T09:00:00",
      "timeOfDeparture": "2025-08-31T12:00:00",
      "createdBy": "admin",
      "createdOn": "2025-08-31T08:00:00",
      "updatedBy": "admin",
      "updatedOn": "2025-08-31T08:30:00"
    }
  ]
}
```

### ErrorPayload

```json
{
  "timestamp": "2025-08-31T10:05:00",
  "status": 400,
  "reason": "BadRequest",
  "message": "NIC number already exists",
  "path": "/visitors",
  "method": "POST"
}
```
