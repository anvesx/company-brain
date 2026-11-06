/**
 * A trigram full-text index over node titles, kept in step with `nodes` by triggers. A substring search of
 * 3 or more characters then reads only the matching rows instead of the whole table.
 */
export const TITLES_DDL = `
CREATE VIRTUAL TABLE IF NOT EXISTS node_titles USING fts5(title, content='nodes', content_rowid='rowid', tokenize='trigram');
CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
  INSERT INTO node_titles(rowid, title) VALUES (new.rowid, new.title);
END;
CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
  INSERT INTO node_titles(node_titles, rowid, title) VALUES ('delete', old.rowid, old.title);
END;
CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE OF title ON nodes BEGIN
  INSERT INTO node_titles(node_titles, rowid, title) VALUES ('delete', old.rowid, old.title);
  INSERT INTO node_titles(rowid, title) VALUES (new.rowid, new.title);
END;`;
