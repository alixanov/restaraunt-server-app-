const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const foodValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2 },
      category: {
        type: "string",
        enum: ["food", "salat", "drink", "desert", "other"],
      },
      price: { type: "number", minimum: 1 },
      discount: { type: "number", minimum: 0, maximum: 100 },
      statusInMenu: { type: "boolean" },
      quantity: { type: "number", minimum: 1 },
    },
    required: ["name", "category", "price", "quantity"],
    additionalProperties: false,
    errorMessage: {
      required: {
        name: "Taom nomi kiritish shart",
        category: "Kategoriya tanlanishi shart",
        price: "Narxi kiritish shart",
        quantity: "Miqdori kiritish shart",
      },
      properties: {
        name: "Taom nomi faqat matn bo'lishi kerak",
        category:
          "Kategoriya faqat 'food', 'salat', 'drink', 'desert', 'other' bo'lishi kerak",
        price: "Narxi faqat son bo'lishi kerak",
        discount: "Chegirma foizi faqat son bo'lishi kerak",
        statusInMenu: "Holat faqat boolean bo'lishi kerak",
        quantity: "Miqdori faqat son bo'lishi kerak",
      },
    },
  };

  let data = JSON.parse(JSON.stringify(req.body));
  data.price = Number(data.price);
  data.discount = Number(data.discount);
  data.quantity = Number(data.quantity);

  const validate = ajv.compile(schema);
  const result = validate(data);
  if (!result) {
    let errorField = validate.errors[0].instancePath.replace("/", "");
    let errorMessage = validate.errors[0].message;
    return response.error(res, `${errorField} xato: ${errorMessage}`);
  }
  next();
};

module.exports = foodValidation;
