// import { useState } from "react";
// import { getTodayDate, validateMedicine } from "../../utils/medicineValidation";

// const initialValues = {
//   name: "",
//   genericName: "",
//   category: "",
//   unit: "",
//   price: "",
//   expiryDate: "",
//   reorderLevel: "",
//   stockQuantity: "0",
// };

// const MedicineForm = ({
//   onSubmit,
//   saving = false,
//   serverError = "",
//     onClearServerError,
//   submitLabel = "Save medicine",
// }) => {
//   const [values, setValues] = useState(initialValues);
//   const [errors, setErrors] = useState({});
//   const [submitted, setSubmitted] = useState(false);

//   const updateField = (event) => {
//     const { name, value } = event.target;

//     setValues((current) => ({ ...current, [name]: value }));
//     onClearServerError?.();

//     if (submitted) {
//       setErrors((current) => {
//         const next = { ...current };
//         delete next[name];
//         return next;
//       });
//     }
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setSubmitted(true);

//     const validationErrors = validateMedicine(values);
//     setErrors(validationErrors);

//     if (Object.keys(validationErrors).length > 0) return;

//     await onSubmit({
//       ...values,
//       name: values.name.trim(),
//       genericName: values.genericName.trim(),
//       category: values.category.trim(),
//       unit: values.unit.trim(),
//       price: values.price.trim(),
//       reorderLevel: values.reorderLevel.trim(),
//     });
//   };

//   const fieldClass = (field) =>
//     `mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
//       errors[field]
//         ? "border-red-500 focus:ring-red-200"
//         : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
//     }`;

//   const renderError = (field) =>
//     errors[field] ? (
//       <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-red-700">
//         {errors[field]}
//       </p>
//     ) : null;

//   return (
//     <form onSubmit={handleSubmit} noValidate className="space-y-5">
//       <div className="grid gap-4 sm:grid-cols-2">
//         <div>
//           <label htmlFor="name" className="text-sm font-medium text-gray-700">
//             Medicine name *
//           </label>
//           <input
//             id="name"
//             name="name"
//             value={values.name}
//             onChange={updateField}
//             className={fieldClass("name")}
//             aria-invalid={Boolean(errors.name)}
//             aria-describedby={errors.name ? "name-error" : undefined}
//           />
//           {renderError("name")}
//         </div>

//         <div>
//           <label htmlFor="genericName" className="text-sm font-medium text-gray-700">
//             Generic name
//           </label>
//           <input
//             id="genericName"
//             name="genericName"
//             value={values.genericName}
//             onChange={updateField}
//             className={fieldClass("genericName")}
//           />
//         </div>

//         <div>
//           <label htmlFor="category" className="text-sm font-medium text-gray-700">
//             Category *
//           </label>
//           <input
//             id="category"
//             name="category"
//             value={values.category}
//             onChange={updateField}
//             className={fieldClass("category")}
//             aria-invalid={Boolean(errors.category)}
//             aria-describedby={errors.category ? "category-error" : undefined}
//           />
//           {renderError("category")}
//         </div>

//         <div>
//           <label htmlFor="unit" className="text-sm font-medium text-gray-700">
//             Unit *
//           </label>
//           <input
//             id="unit"
//             name="unit"
//             value={values.unit}
//             onChange={updateField}
//             placeholder="e.g. tablet, bottle"
//             className={fieldClass("unit")}
//             aria-invalid={Boolean(errors.unit)}
//             aria-describedby={errors.unit ? "unit-error" : undefined}
//           />
//           {renderError("unit")}
//         </div>

//         <div>
//           <label htmlFor="price" className="text-sm font-medium text-gray-700">
//             Unit price (LKR) *
//           </label>
//           <input
//             id="price"
//             name="price"
//             type="number"
//             min="0.01"
//             step="0.01"
//             inputMode="decimal"
//             value={values.price}
//             onChange={updateField}
//             placeholder="e.g. 125.50"
//             className={fieldClass("price")}
//             aria-invalid={Boolean(errors.price)}
//             aria-describedby={errors.price ? "price-error" : undefined}
//           />
//           {renderError("price")}
//         </div>

//         <div>
//           <label htmlFor="reorderLevel" className="text-sm font-medium text-gray-700">
//             Low-stock threshold *
//           </label>
//           <input
//             id="reorderLevel"
//             name="reorderLevel"
//             type="number"
//             min="0"
//             step="1"
//             value={values.reorderLevel}
//             onChange={updateField}
//             className={fieldClass("reorderLevel")}
//             aria-invalid={Boolean(errors.reorderLevel)}
//             aria-describedby={errors.reorderLevel ? "reorderLevel-error" : undefined}
//           />
//           {renderError("reorderLevel")}
//         </div>

//         <div>
//           <label htmlFor="expiryDate" className="text-sm font-medium text-gray-700">
//             Expiry date *
//           </label>
//           <input
//             id="expiryDate"
//             name="expiryDate"
//             type="date"
//             min={getTodayDate()}
//             value={values.expiryDate}
//             onChange={updateField}
//             className={fieldClass("expiryDate")}
//             aria-invalid={Boolean(errors.expiryDate)}
//             aria-describedby={errors.expiryDate ? "expiryDate-error" : undefined}
//           />
//           {renderError("expiryDate")}
//         </div>

//         <div>
//           <label htmlFor="stockQuantity" className="text-sm font-medium text-gray-700">
//             Initial stock
//           </label>
//           <input
//             id="stockQuantity"
//             name="stockQuantity"
//             value="0"
//             readOnly
//             className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
//           />
//           <p className="mt-1 text-xs text-gray-500">
//             New medicines start with zero stock. Adjust stock from Inventory Management.
//           </p>
//         </div>
//       </div>

//       {serverError && (
//         <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
//           {serverError}
//         </p>
//       )}

//       <div className="flex flex-wrap gap-3">
//         <button
//           type="submit"
//           disabled={saving}
//           className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
//         >
//           {saving ? "Saving..." : submitLabel}
//         </button>

//         <button
//           type="button"
//           disabled={saving}
//           onClick={() => {
//             setValues(initialValues);
//             setErrors({});
//             setSubmitted(false);
//           }}
//           className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-800 disabled:opacity-50"
//         >
//           Reset
//         </button>
//       </div>
//     </form>
//   );
// };

// export default MedicineForm;


import {  useState } from "react";
import {
  getTodayDate,
  validateMedicine,
} from "../../utils/medicineValidation";

const EMPTY_VALUES = {
  name: "",
  genericName: "",
  category: "",
  unit: "",
  price: "",
  expiryDate: "",
  reorderLevel: "",
  stockQuantity: "0",
};

const normalizeValues = (values = {}) => ({
  ...EMPTY_VALUES,
  ...values,
  name: values.name ?? "",
  genericName: values.genericName ?? "",
  category: values.category ?? "",
  unit: values.unit ?? "",
  price: values.price == null ? "" : String(values.price),
  expiryDate: values.expiryDate ?? "",
  reorderLevel:
    values.reorderLevel == null ? "" : String(values.reorderLevel),
  stockQuantity:
    values.stockQuantity == null ? "0" : String(values.stockQuantity),
});

const MedicineForm = ({
  onSubmit,
  saving = false,
  serverError = "",
  onClearServerError,
  submitLabel = "Save medicine",
  initialValues = EMPTY_VALUES,
  mode = "create",
}) => {
  const [values, setValues] = useState(() =>
    normalizeValues(initialValues),
  );
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // useEffect(() => {
  //   setValues(normalizeValues(initialValues));
  //   setErrors({});
  //   setSubmitted(false);
  // }, [initialValues]);

  const isEditMode = mode === "edit";

  const updateField = (event) => {
    const { name, value } = event.target;

    if (name === "stockQuantity") return;

    setValues((current) => ({ ...current, [name]: value }));
    onClearServerError?.();

    if (submitted) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    const validationErrors = validateMedicine(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    await onSubmit({
      ...values,
      name: values.name.trim(),
      genericName: values.genericName.trim(),
      category: values.category.trim(),
      unit: values.unit.trim(),
      price: values.price.trim(),
      reorderLevel: values.reorderLevel.trim(),
      stockQuantity: values.stockQuantity,
    });
  };

  const fieldClass = (field) =>
    `mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
      errors[field]
        ? "border-red-500 focus:ring-red-200"
        : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
    }`;

  const renderError = (field) =>
    errors[field] ? (
      <p
        id={`${field}-error`}
        role="alert"
        className="mt-1 text-sm text-red-700"
      >
        {errors[field]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Medicine name *
          </label>
          <input
            id="name"
            name="name"
            value={values.name}
            onChange={updateField}
            className={fieldClass("name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {renderError("name")}
        </div>

        <div>
          <label
            htmlFor="genericName"
            className="text-sm font-medium text-gray-700"
          >
            Generic name
          </label>
          <input
            id="genericName"
            name="genericName"
            value={values.genericName}
            onChange={updateField}
            className={fieldClass("genericName")}
          />
        </div>

        <div>
          <label
            htmlFor="category"
            className="text-sm font-medium text-gray-700"
          >
            Category *
          </label>
          <input
            id="category"
            name="category"
            value={values.category}
            onChange={updateField}
            className={fieldClass("category")}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? "category-error" : undefined}
          />
          {renderError("category")}
        </div>

        <div>
          <label htmlFor="unit" className="text-sm font-medium text-gray-700">
            Unit *
          </label>
          <input
            id="unit"
            name="unit"
            value={values.unit}
            onChange={updateField}
            placeholder="e.g. tablet, bottle"
            className={fieldClass("unit")}
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={errors.unit ? "unit-error" : undefined}
          />
          {renderError("unit")}
        </div>

        <div>
          <label
            htmlFor="price"
            className="text-sm font-medium text-gray-700"
          >
            Unit price (LKR) *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={values.price}
            onChange={updateField}
            placeholder="e.g. 125.50"
            className={fieldClass("price")}
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "price-error" : undefined}
          />
          {renderError("price")}
        </div>

        <div>
          <label
            htmlFor="reorderLevel"
            className="text-sm font-medium text-gray-700"
          >
            Low-stock threshold *
          </label>
          <input
            id="reorderLevel"
            name="reorderLevel"
            type="number"
            min="0"
            step="1"
            value={values.reorderLevel}
            onChange={updateField}
            className={fieldClass("reorderLevel")}
            aria-invalid={Boolean(errors.reorderLevel)}
            aria-describedby={
              errors.reorderLevel ? "reorderLevel-error" : undefined
            }
          />
          {renderError("reorderLevel")}
        </div>

        <div>
          <label
            htmlFor="expiryDate"
            className="text-sm font-medium text-gray-700"
          >
            Expiry date *
          </label>
          <input
            id="expiryDate"
            name="expiryDate"
            type="date"
            min={getTodayDate()}
            value={values.expiryDate}
            onChange={updateField}
            className={fieldClass("expiryDate")}
            aria-invalid={Boolean(errors.expiryDate)}
            aria-describedby={
              errors.expiryDate ? "expiryDate-error" : undefined
            }
          />
          {renderError("expiryDate")}
        </div>

        <div>
          <label
            htmlFor="stockQuantity"
            className="text-sm font-medium text-gray-700"
          >
            {isEditMode ? "Current stock (read-only)" : "Initial stock"}
          </label>
          <input
            id="stockQuantity"
            name="stockQuantity"
            type="number"
            value={values.stockQuantity}
            readOnly
            className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            Stock can only be changed through Inventory Management.
          </p>
        </div>
      </div>

      {serverError && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : submitLabel}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setValues(normalizeValues(initialValues));
            setErrors({});
            setSubmitted(false);
            onClearServerError?.();
          }}
          className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-800 disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default MedicineForm;
