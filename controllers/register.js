function stringToDate(_date,_format,_delimiter)
{
            var formatLowerCase=_format.toLowerCase();
            var formatItems=formatLowerCase.split(_delimiter);
            var dateItems=_date.split(_delimiter);
            var monthIndex=formatItems.indexOf("mm");
            var dayIndex=formatItems.indexOf("dd");
            var yearIndex=formatItems.indexOf("yyyy");
            var month=parseInt(dateItems[monthIndex]);
            month-=1;
            var formatedDate = new Date(dateItems[yearIndex],month,dateItems[dayIndex]);
            return formatedDate;
}

function reverse(string) {
    return string.split('-').reverse().join('/');
}

const handleRegister = (req, res, db, bcrypt, saltRounds) => {
  let { name, email, phoneno, dob, password } = req.body;
  dob = reverse(dob);

  if(!email || !name || !password) {
    return res.status(400).json('invalid request')
  }

  const hashed_pswd = bcrypt.hashSync(password, saltRounds);

  db.transaction(trx => {
    trx.insert({
      email: email,
      hash: hashed_pswd
    })
    .into('login')
    .returning('email')
    .then(loginEmail => {
      return trx('customers')
        .returning('*')
        .insert({
          phoneno: phoneno,
          email: email,
          dob: stringToDate(dob,"dd/mm/yyyy","/"),
          name: name
        })
        .then(user => {
          res.json(user[0]);
        })
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
    .catch(err => res.status(400).json(err))
}

module.exports = {
  handleRegister
}
