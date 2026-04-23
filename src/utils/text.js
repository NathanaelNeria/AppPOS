const LINE_WIDTH = 48;

const line = () => "-".repeat(LINE_WIDTH) + "\n";

const centerText = (text) => {
  if (text.length >= LINE_WIDTH) return text + "\n";
  const space = Math.floor((LINE_WIDTH - text.length) / 2);
  return " ".repeat(space) + text + "\n";
};

const leftRight = (left, right) => {
  let space = LINE_WIDTH - left.length - right.length;
  if (space < 1) space = 1;
  return left + " ".repeat(space) + right + "\n";
};

// wrap text biar ga kepotong
const wrapText = (text, indent = "") => {
  const max = LINE_WIDTH - indent.length;
  let result = "";
  while (text.length > max) {
    result += indent + text.slice(0, max) + "\n";
    text = text.slice(max);
  }
  result += indent + text + "\n";
  return result;
};

export {
  LINE_WIDTH,
  line,
  centerText,
  leftRight,
  wrapText,
};