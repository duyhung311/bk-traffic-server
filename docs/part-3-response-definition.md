# 3. Response Definition

The response of each API have the same structure:

```javascript
{
    "code": xxx, //status code
    "message":"Human-readable message",//status message,developer can read this message for debugging
    "data":{}, //or [] , exists when response success
    "errors":[] // exists when response failure
    "debugError": {} //more human-readable info for fix bug purpose
}
```

## Response code

_Code_ | _Message_ | _Detail_
--- | --- | ---
200 | SUCCESS | Perform task success
400 | BAD REQUEST | Bad input parameter.
401 | UNAUTHORIZED | The client passed in the invalid Auth token.
404 | NOT FOUND | Url doest not exist
409 | CONFLICT | Try to create a exist resource
500 | INTERNAL SERVER ERROR | Server are not working as expected. The request is probably valid but need to be requested again later
503 | SERVICE ERROR | Service unavailable

## Error detail

### Error response structure

```javascript
{
    "code":4xx,
    "message":"Error message",
    "errors":
    [
        {
            "domain":"field_1",
            "reason": "required",
            "message":"Field_1 existed",
        },
        {
            "domain":"field_2",
            "reason":"invalid",
            "message":"The field is missing or has invalid format"
        }
    ]
}
```

### Reason type

_Reason_ | _Message_ | _Detail_
--- | --- | ---
required | Missing parameter | The parameters are missing
invalid | Invalid format | The field has invalid format
incorrect | Incorrect | The field has valid format but this value is incorrect
duplicated | Duplicate | The field has valid format but this value is duplicated
