const { formatResponse, normalizeString } = require("./responseFormatter");

class Question {
  constructor() {
    this.question = null;
    this.answer = null;
  }

  setQuestionAndAnswer(arg0) {
    if (!arg0.question?.trim() || !arg0.answer.trim()) {
      return formatResponse(null, "Please provide all input value");
    }
    this.question = arg0.question;
    this.answer = arg0.answer;
    return formatResponse({
      question: this.question,
      answer: this.answer,
    });
  }

  isAnswer(ans) {
    const isAnswer = normalizeString(ans) === normalizeString(this.answer);
    return isAnswer;
  }

  reset() {
    this.question = null;
    this.answer = null;
  }
}

const question = new Question();

module.exports = question;
