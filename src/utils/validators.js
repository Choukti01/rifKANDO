export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhone = (phone) => {
  const re = /^[0-9]{10}$/
  return re.test(phone)
}

export const validatePassword = (password) => {
  return password.length >= 6
}

export const validateName = (name) => {
  return name.length >= 2 && name.length <= 50
}

export const validatePrice = (price) => {
  return price > 0 && !isNaN(price)
}

export const validateQuantity = (quantity) => {
  return quantity >= 1 && Number.isInteger(quantity)
}