export function flag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setFlag(key, val) {
  try {
    localStorage.setItem(key, val ? "1" : "0");
  } catch {
    /* ignore — private browsing / storage disabled */
  }
}
