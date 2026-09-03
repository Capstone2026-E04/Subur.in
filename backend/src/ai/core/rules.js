const RULE_BASE = [
  { id: 'R1',  phSet: 'sangatAsam', moistureSet: 'kering', outputCategory: 5 },
  { id: 'R2',  phSet: 'sangatAsam', moistureSet: 'sedang', outputCategory: 4 },
  { id: 'R3',  phSet: 'sangatAsam', moistureSet: 'lembap', outputCategory: 4 },
  { id: 'R4',  phSet: 'sangatAsam', moistureSet: 'jenuh',  outputCategory: 6 },
  { id: 'R5',  phSet: 'asam',       moistureSet: 'kering', outputCategory: 5 },
  { id: 'R6',  phSet: 'asam',       moistureSet: 'sedang', outputCategory: 4 },
  { id: 'R7',  phSet: 'asam',       moistureSet: 'lembap', outputCategory: 4 },
  { id: 'R8',  phSet: 'asam',       moistureSet: 'jenuh',  outputCategory: 6 },
  { id: 'R9',  phSet: 'optimal',    moistureSet: 'kering', outputCategory: 2 },
  { id: 'R10', phSet: 'optimal',    moistureSet: 'sedang', outputCategory: 1 },
  { id: 'R11', phSet: 'optimal',    moistureSet: 'lembap', outputCategory: 1 },
  { id: 'R12', phSet: 'optimal',    moistureSet: 'jenuh',  outputCategory: 3 },
  { id: 'R13', phSet: 'basa',       moistureSet: 'kering', outputCategory: 8 },
  { id: 'R14', phSet: 'basa',       moistureSet: 'sedang', outputCategory: 7 },
  { id: 'R15', phSet: 'basa',       moistureSet: 'lembap', outputCategory: 7 },
  { id: 'R16', phSet: 'basa',       moistureSet: 'jenuh',  outputCategory: 9 },
  { id: 'R17', phSet: 'sangatBasa', moistureSet: 'kering', outputCategory: 8 },
  { id: 'R18', phSet: 'sangatBasa', moistureSet: 'sedang', outputCategory: 7 },
  { id: 'R19', phSet: 'sangatBasa', moistureSet: 'lembap', outputCategory: 7 },
  { id: 'R20', phSet: 'sangatBasa', moistureSet: 'jenuh',  outputCategory: 9 },
];

module.exports = RULE_BASE;
