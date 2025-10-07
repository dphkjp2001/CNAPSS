// backend/utils/anon.js
const crypto = require("crypto");

// 글 본문(카드/상세)에서 글쓴이 표기
function aliasForPostAuthor() {
  return "anonymous";
}

// 댓글 스레드용 번호 매핑 생성
// comments: createdAt ASC 정렬된 평면 배열(authorId 포함)
// postAuthorId: 글쓴이 userId
function buildCommentAliasMap({ comments, postAuthorId }) {
  const map = new Map();
  let counter = 1;
  for (const c of comments) {
    const uid = String(c.authorId);
    if (uid === String(postAuthorId)) continue; // 글쓴이는 번호를 부여하지 않음(OP 전용)
    if (!map.has(uid)) {
      map.set(uid, `anonymous${counter++}`);
    }
  }
  return map;
}

// DM용: 두 참여자에게 숫자 라벨 부여 (anonymous1/anonymous2)
function aliasMapForConversation({ userIdA, userIdB }) {
  const [first, second] = [String(userIdA), String(userIdB)].sort();
  return {
    [first]: "anonymous1",
    [second]: "anonymous2"
  };
}

module.exports = {
  aliasForPostAuthor,
  buildCommentAliasMap,
  aliasMapForConversation
};
