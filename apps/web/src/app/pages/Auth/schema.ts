import * as Yup from "yup";

export interface AuthFormValues {
  email: string;
  password: string;
}

export const schema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email("Geçerli bir e-posta girin")
    .required("E-posta zorunludur"),
  password: Yup.string().trim().required("Şifre zorunludur"),
});
