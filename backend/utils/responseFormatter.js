const formatResponse = (data, error) => {
  if (error) {
    return {
      data: null,
      ok: false,
      error: error,
    };
  }
  return {
    data: data,
    ok: true,
    error: null,
  };
};

const normalizeString = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "")
    .trim();
};

const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

module.exports = { formatResponse, normalizeString, capitalizeFirstLetter };
