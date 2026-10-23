export const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const validateMedicine = (values) => {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = "Medicine name is required.";
  }

  if (!values.category.trim()) {
    errors.category = "Category is required.";
  }

  if (!values.unit.trim()) {
    errors.unit = "Unit is required.";
  }

  if (values.price.trim() === "") {
    errors.price = "Price is required.";
  } else if (!Number.isFinite(Number(values.price)) || Number(values.price) <= 0) {
    errors.price = "Price must be greater than 0.";
  } else if (!/^\d+(\.\d{1,2})?$/.test(values.price.trim())) {
    errors.price = "Enter a price with no more than 2 decimal places.";
  }

  if (values.reorderLevel.trim() === "") {
    errors.reorderLevel = "Low-stock threshold is required.";
  } else if (
    !/^\d+$/.test(values.reorderLevel.trim()) ||
    !Number.isSafeInteger(Number(values.reorderLevel))
  ) {
    errors.reorderLevel ="Threshold must be a whole number greater than or equal to 0.";
  }

  if (!values.expiryDate) {
    errors.expiryDate = "Expiry date is required.";
  } else if (values.expiryDate < getTodayDate()) {
    errors.expiryDate = "Expiry date cannot be in the past.";
  }

  if (values.stockQuantity.trim() === "") {
    errors.stockQuantity = "Initial stock is required.";
  } else if (
    !/^\d+$/.test(values.stockQuantity.trim()) ||
    !Number.isSafeInteger(Number(values.stockQuantity))
  ) {
    errors.stockQuantity = "Stock must be a whole number greater than or equal to 0.";
  }

  return errors;
};