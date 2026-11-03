
import { useFormik } from "formik";
import * as Yup from "yup";

function FormikPractice() {
  // Yup validation rules
  const validationSchema = Yup.object({
    name: Yup.string()
      .min(3, "Name must contain at least 3 characters")
      .required("Name is required"),

    email: Yup.string()
      .email("Enter a valid email")
      .required("Email is required"),

    age: Yup.number()
      .typeError("Age must be a number")
      .min(18, "Age must be at least 18")
      .max(60, "Age cannot exceed 60")
      .required("Age is required"),

    department: Yup.string()
      .required("Please select a department"),
  });

  // Formik configuration
  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      age: "",
      department: "",
    },

    validationSchema,

    onSubmit: (values, { resetForm }) => {
      console.log("Submitted Form Data:", values);
      alert("Form submitted successfully!");
      resetForm();
    },
  });

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto" }}>
      <h1>Formik Form Practice</h1>

      <form onSubmit={formik.handleSubmit}>

        {/* Text input */}
        <div style={{ marginBottom: "15px" }}>
          <label>Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            {...formik.getFieldProps("name")}
            style={{ width: "100%", padding: "10px" }}
          />

          {formik.touched.name && formik.errors.name && (
            <p style={{ color: "red" }}>{formik.errors.name}</p>
          )}
        </div>

        {/* Email input */}
        <div style={{ marginBottom: "15px" }}>
          <label>Email</label>
          <input
            type="text"
            placeholder="Enter your email"
            {...formik.getFieldProps("email")}
            style={{ width: "100%", padding: "10px" }}
          />

          {formik.touched.email && formik.errors.email && (
            <p style={{ color: "red" }}>{formik.errors.email}</p>
          )}
        </div>

        {/* Number input */}
        <div style={{ marginBottom: "15px" }}>
          <label>Age</label>
          <input
            type="number"
            placeholder="Enter your age"
            {...formik.getFieldProps("age")}
            style={{ width: "100%", padding: "10px" }}
          />

          {formik.touched.age && formik.errors.age && (
            <p style={{ color: "red" }}>{formik.errors.age}</p>
          )}
        </div>

        {/* Dropdown */}
        <div style={{ marginBottom: "15px" }}>
          <label>Department</label>
          <select
            {...formik.getFieldProps("department")}
            style={{ width: "100%", padding: "10px" }}
          >
            <option value="">Select Department</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            <option value="Marketing">Marketing</option>
          </select>

          {formik.touched.department && formik.errors.department && (
            <p style={{ color: "red" }}>
              {formik.errors.department}
            </p>
          )}
        </div>

        <button type="submit">
          Submit Form
        </button>

        <button
          type="button"
          onClick={formik.resetForm}
          style={{ marginLeft: "10px" }}
        >
          Reset
        </button>

      </form>
    </div>
  );
}

export default FormikPractice;
