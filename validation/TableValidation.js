const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const tableValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      number: { type: "number", minimum: 1 },
      capacity: { type: "number", minimum: 1 },
    },
    required: ["number", "capacity"],
    additionalProperties: false,
    errorMessage: {
      required: {
        number: "Stol raqami kiritish shart",
        capacity: "O'rinlar soni kiritish shart",
      },
      properties: {
        number: "Stol raqami faqat son bo‘lishi kerak",
        capacity: "O'rinlar soni faqat son bo‘lishi kerak",
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

module.exports = tableValidation;
