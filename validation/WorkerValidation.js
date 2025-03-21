const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const workerValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      fullname: { type: "string", minLength: 2, maxLength: 50 },
      phone: {
        type: "string",
        pattern: "^\\+7[0-9]{10}$", // +7 bilan boshlanib, jami 11 ta raqam bo‘lishi kerak
      },
      password: { type: "string", minLength: 6, pattern: "^[a-zA-Z0-9]+$" },
      login: { type: "string", minLength: 6, pattern: "^[a-zA-Z0-9]+$" },
      role: { type: "string", enum: ["admin", "chef", "waiter"] },
      salary: { type: "number", minimum: 0 },
      isActive: { type: "boolean" },
    },
    required: ["fullname", "phone", "password", "login", "role"],
    additionalProperties: false,
    errorMessage: {
      required: {
        fullname: "Ism-familiya kiritish shart",
        phone: "Telefon raqam noto‘g‘ri formatda, masalan: +79876543210",
        password: "Parol kiritish shart",
        login: "Login kiritish shart",
        role: "Ishchi roli kiritish shart",
      },
      properties: {
        fullname: "Ism-familiya noto‘g‘ri formatda",
        phone: "Telefon raqam noto‘g‘ri formatda, masalan: +79876543210",
        password: "Parol kamida 6 ta belgi bo‘lishi kerak",
        login: "Login kamida 6 ta belgi bo‘lishi kerak",
        role: "Roli faqat admin, chef yoki waiter bo‘lishi mumkin",
        salary: "Maosh 0 dan kam bo‘lmasligi kerak",
      },
    },
  };

  const validate = ajv.compile(schema);
  const result = validate(req.body);
  if (!result) {
    let errorField = validate.errors[0].instancePath.replace("/", "");
    let errorMessage = validate.errors[0].message;
    return response.error(res, `${errorField} xato: ${errorMessage}`);
  }
  next();
};

module.exports = workerValidation;
