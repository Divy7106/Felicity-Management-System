function jsonToFormData(data, formData = new FormData(), parentKey = '') {
  if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
    Object.keys(data).forEach(key => {
      const value = data[key];
      const newKey = parentKey ? `${parentKey}[${key}]` : key;

      jsonToFormData(value, formData, newKey);
    });
  } else {
    formData.append(parentKey, data);
  }

  return formData;
}

export {
    jsonToFormData
}
