import gql from "graphql-tag";

export const meta = gql`
  type IssueMeta {
    skipContentIncluded: Boolean
  }

  type IssueInfo {
    issuesFixedByCdn: Int
    possibleIssuesFixedByCdn: Int
    totalIssues: Int
    issueMeta: IssueMeta
    accessScoreAverage: Int
    accessScore: Int
    errorCount: Int
    warningCount: Int
    noticeCount: Int
    pageCount: Int
  }

  type PageLoadTimeMeta {
    duration: Int
    durationFormated: String
    color: String
  }

  type ScriptMeta {
    skipContentEnabled: Boolean
    translateEnabled: Boolean
  }
`;
