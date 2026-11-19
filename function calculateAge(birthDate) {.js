/**
 * Returns a person's age in whole years.
 * @param {string|number|Date} birthDate - anything `new Date()` accepts (e.g. "2000-08-15")
 * @returns {number} completed years as of today
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);

  // Raw year difference; too high by 1 if the birthday hasn't happened yet this year
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();

  // Birthday not reached yet: earlier month, OR same month but earlier day
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// ES module export so other files can `import { calculateAge }`
export { calculateAge };
