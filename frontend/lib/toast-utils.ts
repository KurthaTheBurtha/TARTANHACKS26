import toast from "react-hot-toast";

export function showSuccess(message: string) {
  return toast.success(message);
}

export function showError(message: string) {
  return toast.error(message);
}

export function showLoading(message: string) {
  return toast.loading(message);
}
