// @env-allow-legacy-dotenv
import dotenv from 'dotenv';

// Load .env.local explicitly
dotenv.config({ path: '.env.local' });

// Optional fallback to .env if needed
dotenv.config();

if (!process.env.MONDAY_TOKEN) {
  console.error('MONDAY_TOKEN environment variable is required to sync the executive dashboard.');
  process.exit(1);
}

const API_URL = 'https://api.monday.com/v2';
const BOARD_NAME = 'Bookiji — Executive Dashboard (Read-Only)';
const BOARD_DESCRIPTION = [
  'This board is system-generated.',
  'Manual edits will be overwritten.',
  'Executive snapshot only; no manual maintenance.'
].join(' ');

const EXECUTIVE_SUBSYSTEMS = [
  {
    name: 'Scheduling Engine',
    phase: 'Certified',
    risk: 'Low',
    environment: 'Staging',
    evidence: 'tag:scheduling-certified-v1',
    subItems: [
      'Slot generation correctness',
      'Availability conflict resolution',
      'Timezone normalization',
      'Idempotent booking claim',
      'Past-slot rejection',
      'Load behavior under burst traffic'
    ]
  },
  {
    name: 'Process Invariant Enforcement (PIE)',
    phase: 'Certified',
    risk: 'Low',
    environment: 'Staging',
    evidence: 'docs/invariants/',
    subItems: [
      'Static invariant validation',
      'Runtime invariant enforcement',
      'CI invariant gate',
      'Failure-mode classification',
      'Regression detection coverage'
    ]
  },
  {
    name: 'Jarvis Incident Commander',
    phase: 'Rehearsing',
    risk: 'Medium',
    environment: 'Staging',
    evidence: 'chaos/sessions/',
    subItems: [
      'Incident eligibility detection',
      'Incident creation correctness',
      'Notification suppression logic',
      'Quiet-hours behavior',
      'ACK handling',
      'Escalation cap enforcement'
    ]
  },
  {
    name: 'SimCity Chaos Framework',
    phase: 'Rehearsing',
    risk: 'Medium',
    environment: 'Staging',
    evidence: 'chaos/sessions/',
    subItems: [
      'Authenticated chaos entry',
      'Scenario execution determinism',
      'Observation capture fidelity',
      'Snapshot aggregation correctness',
      'Failure localization',
      'Incident triggering under chaos',
      'Noise suppression under stress'
    ]
  },
  {
    name: 'Production Readiness',
    phase: 'Concept',
    risk: 'Medium',
    environment: 'Production',
    evidence: 'runbooks/',
    subItems: [
      'Environment separation (local/staging/prod)',
      'Fail-closed guarantees',
      'Deployment safety checks',
      'Observability completeness',
      'Rollback readiness'
    ]
  }
];

// Parent rows assert truth; sub-items justify it; ETC estimates effort; only the repo decides authority.

const EXECUTIVE_STATUS_LABELS = [
  'Concept',
  'Rehearsing',
  'Certified',
  'Blocked',
  'Deprecated'
];
const EXECUTIVE_RISK_LABELS = ['Low', 'Medium', 'High'];
const EXECUTIVE_ENV_LABELS = ['Local', 'Staging', 'Production'];

const REQUIRED_COLUMNS = [
  {
    title: 'Phase',
    columnType: 'status',
    labels: ['Concept', 'Implemented', 'Certified', 'Rehearsing', 'Blocked', 'Ready']
  },
  {
    title: 'Risk',
    columnType: 'status',
    labels: ['Low', 'Medium', 'High']
  },
  {
    title: 'Environment',
    columnType: 'status',
    labels: ['Local', 'Staging', 'Prod']
  },
  {
    title: 'Last Verified',
    columnType: 'date'
  },
  {
    title: 'Evidence',
    columnType: 'link'
  },
  {
    title: 'Notes',
    columnType: 'long_text'
  }
];

// Monday GraphQL uses ID (string) semantics for item and board identifiers; never use Int for IDs.
const fetchWithRetry = async (token, query, variables = {}) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Monday API responded with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors && payload.errors.length) {
    throw new Error(
      payload.errors.map((error) => error.message).join(' | ')
    );
  }

  return payload.data;
};

const ensureBoard = async (token) => {
  const query = `
    query ($limit: Int!) {
      boards(limit: $limit) {
        id
        name
        board_kind
      }
    }
  `;

  const { boards } = await fetchWithRetry(token, query, { limit: 250 });
  const match = boards?.find((board) => board.name === BOARD_NAME);
  if (match) {
    if (match.board_kind !== 'private') {
      await fetchWithRetry(
        token,
        `
          mutation ($boardId: ID!) {
            change_board_kind(board_id: $boardId, board_kind: private) {
              id
            }
          }
        `,
        { boardId: match.id }
      );
    }
    return match;
  }

  const mutation = `
    mutation ($name: String!) {
      create_board(board_name: $name, board_kind: private) {
        id
        name
        board_kind
      }
    }
  `;

  const data = await fetchWithRetry(token, mutation, { name: BOARD_NAME });
  return data.create_board;
};

const updateBoardDescription = `
  mutation UpdateBoardDescription($boardId: ID!, $description: String!) {
    update_board(
      board_id: $boardId,
      board_attribute: description,
      new_value: $description
    )
  }
`;

const describeBoard = async (token, boardId) => {
  await fetchWithRetry(token, updateBoardDescription, {
    boardId,
    description: BOARD_DESCRIPTION
  });
};

const ensureColumns = async (token, boardId) => {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns {
          id
          title
          type
          settings
          settings_str
        }
      }
    }
  `;

  const refreshColumns = async () => {
    const { boards } = await fetchWithRetry(token, query, { boardId });
    return boards?.[0]?.columns ?? [];
  };

  let columns = await refreshColumns();
  const existingTitles = new Set(columns.map((column) => column.title));

  const createColumnMutation = `
    mutation CreateColumn(
      $boardId: ID!
      $title: String!
      $columnType: ColumnType!
    ) {
      create_column(
        board_id: $boardId
        title: $title
        column_type: $columnType
      ) {
        id
      }
    }
  `;

  for (const requirement of REQUIRED_COLUMNS) {
    if (existingTitles.has(requirement.title)) {
      continue;
    }

    await fetchWithRetry(token, createColumnMutation, {
      boardId,
      title: requirement.title,
      columnType: requirement.columnType
    });
  }

  columns = await refreshColumns();
  const findStatusColumn = (title) =>
    columns.find((column) => column.title === title && column.type === 'status');

  const parseStatusLabelMap = (column, columnName, canonicalLabels) => {
    if (!column) {
      throw new Error(`${columnName} column must exist before syncing items.`);
    }
    if (!column.settings_str) {
      throw new Error(
        `${columnName} column settings_str is required to map labels to indices.`
      );
    }
    let settings = {};
    try {
      settings = JSON.parse(column.settings_str);
    } catch (error) {
      throw new Error(`Unable to parse ${columnName} column settings: ${error.message}`);
    }
    const labels = settings?.labels ?? {};
    const labelMap = Object.entries(labels).reduce((map, [index, name]) => {
      const numericIndex = Number(index);
      if (Number.isNaN(numericIndex)) {
        return map;
      }
      map[name] = numericIndex;
      return map;
    }, {});

    // Monday Status columns always include index 0 (default/null). This is tolerated but never written. Canonical labels must exist; extra labels are ignored.
    const missingLabels = canonicalLabels.filter((label) => !(label in labelMap));

    if (missingLabels.length) {
      throw new Error(
        `${columnName} column is missing canonical status labels (${missingLabels.join(
          ', '
        )}). Please configure the column in Monday.com to use [${canonicalLabels.join(
          ', '
        )}] before running this sync.`
      );
    }

    // If a canonical label is bound to index 0, the column is structurally unwritable and will be skipped until reconfigured.
    for (const label of canonicalLabels) {
      const idx = labelMap[label];

      if (idx === 0) {
        return {
          writable: false,
          reason:
            `"${label}" is bound to index 0 (default/null). ` +
            `Reorder labels in Monday so index 0 is reserved for null.`,
          labelMap
        };
      }
    }

    return {
      writable: true,
      labelMap
    };
  };

  const phaseColumn = findStatusColumn('Phase');
  const riskColumn = findStatusColumn('Risk');
  const environmentColumn = findStatusColumn('Environment');

  if (!phaseColumn) {
    throw new Error('The Phase column must exist before syncing items.');
  }

  const phaseColumnMeta = parseStatusLabelMap(
    phaseColumn,
    'Phase',
    EXECUTIVE_STATUS_LABELS
  );
  const riskColumnMeta = parseStatusLabelMap(
    riskColumn,
    'Risk',
    EXECUTIVE_RISK_LABELS
  );
  const environmentColumnMeta = parseStatusLabelMap(
    environmentColumn,
    'Environment',
    EXECUTIVE_ENV_LABELS
  );

  const columnMap = columns.reduce((map, column) => {
    map[column.title] = column.id;
    return map;
  }, {});

  // TODO: Future implementation may read each subsystem's sub-items to aggregate Phase/Risk/Last Verified (Blocked > ...).
  // TODO: Once aggregation is enforced, fail the sync when a parent diverges from its derived state.
  return {
    columnMap,
    labelMaps: {
    phase: phaseColumnMeta,
    risk: riskColumnMeta,
    environment: environmentColumnMeta
  }
};
};

const loadExistingItems = async (token, boardId) => {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 100) {
          items {
            id
            name
            subitems(limit: 100) {
              id
              name
            }
          }
        }
      }
    }
  `;

  const { boards } = await fetchWithRetry(token, query, { boardId });
  const items = boards?.[0]?.items_page?.items ?? [];
  const parentIndex = {};
  const subitemIndex = {};

  for (const item of items) {
    parentIndex[item.name] = item.id;
    const children = {};
    for (const child of item.subitems ?? []) {
      children[child.name] = child.id;
    }
    subitemIndex[item.name] = children;
  }

  return {
    parentIndex,
    subitemIndex
  };
};

const upsertItems = async (token, boardId, columnMap, labelMaps) => {
  const { parentIndex, subitemIndex } = await loadExistingItems(token, boardId);

  const now = new Date().toISOString().split('T')[0];

  const ensureColumn = (name) => {
    const columnId = columnMap[name];
    if (!columnId) {
      throw new Error(`Column ${name} must exist before upserting rows`);
    }
    return columnId;
  };

  const phaseColumn = ensureColumn('Phase');
  const riskColumn = ensureColumn('Risk');
  const envColumn = ensureColumn('Environment');
  const lastVerifiedColumn = ensureColumn('Last Verified');
  const evidenceColumn = ensureColumn('Evidence');

  const {
    phase: phaseMeta,
    risk: riskMeta,
    environment: environmentMeta
  } = labelMaps;
  const warnUnwritableColumn = (columnTitle, meta) => {
    if (!meta.writable) {
      console.warn(
        `⚠️ ${columnTitle} column is not writable: ${
          meta.reason ??
          'Reconfigure the column so canonical labels are not bound to index 0.'
        }`
      );
    }
  };

  warnUnwritableColumn('Phase', phaseMeta);
  warnUnwritableColumn('Risk', riskMeta);
  warnUnwritableColumn('Environment', environmentMeta);
  const getStatusIndex = (map, value, columnName) => {
    if (!(value in map)) {
      throw new Error(`${columnName} "${value}" not found in Monday label map`);
    }
    const index = Number(map[value]);
    if (Number.isNaN(index)) {
      throw new Error(
        `Discovered index for ${columnName} "${value}" is not a number`
      );
    }
    if (index === 0) {
      throw new Error(
        `Refusing to write default/null status for ${columnName}`
      );
    }
    return index;
  };

  const setStatusColumnValue = (
    values,
    value,
    columnMeta,
    columnId,
    columnName
  ) => {
    if (!columnMeta.writable) {
      return;
    }
    const isAbsent =
      value == null ||
      value === '' ||
      (typeof value === 'object' && Object.keys(value).length === 0);
    if (isAbsent) {
      return;
    }
    const index = getStatusIndex(columnMeta.labelMap, value, columnName);
    values[columnId] = { index };
  };

  for (const subsystem of EXECUTIVE_SUBSYSTEMS) {
    const columnValues = {};
    setStatusColumnValue(columnValues, subsystem.phase, phaseMeta, phaseColumn, 'Phase');
    setStatusColumnValue(columnValues, subsystem.risk, riskMeta, riskColumn, 'Risk');
    setStatusColumnValue(
      columnValues,
      subsystem.environment,
      environmentMeta,
      envColumn,
      'Environment'
    );
    columnValues[lastVerifiedColumn] = { date: now };
    columnValues[evidenceColumn] = {
      url: subsystem.evidence,
      text: subsystem.evidence
    };
    const valuesPayload = JSON.stringify(columnValues);

    let parentId = parentIndex[subsystem.name];
    if (parentId) {
      await fetchWithRetry(
        token,
        `
          mutation ($itemId: ID!, $boardId: ID!, $values: JSON!) {
            change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $values) {
              id
            }
          }
        `,
        {
          itemId: String(parentId),
          boardId,
          values: valuesPayload
        }
      );
    } else {
      const data = await fetchWithRetry(
        token,
        `
          mutation ($boardId: ID!, $name: String!, $values: JSON!) {
            create_item(board_id: $boardId, item_name: $name, column_values: $values) {
              id
            }
          }
        `,
        {
          boardId,
          name: subsystem.name,
          values: valuesPayload
        }
      );
      parentId = data?.create_item?.id;
      if (!parentId) {
        throw new Error(`Unable to create parent item for ${subsystem.name}`);
      }
      parentIndex[subsystem.name] = parentId;
    }

    const childMap = subitemIndex[subsystem.name] ?? {};
    subitemIndex[subsystem.name] = childMap;

    for (const subItemName of subsystem.subItems ?? []) {
      const subColumnValues = {};
      setStatusColumnValue(subColumnValues, subsystem.phase, phaseMeta, phaseColumn, 'Phase');
      setStatusColumnValue(subColumnValues, subsystem.risk, riskMeta, riskColumn, 'Risk');
      setStatusColumnValue(
        subColumnValues,
        subsystem.environment,
        environmentMeta,
        envColumn,
        'Environment'
      );
      const subValuesPayload = JSON.stringify(subColumnValues);

      if (childMap[subItemName]) {
        await fetchWithRetry(
          token,
          `
            mutation ($itemId: ID!, $boardId: ID!, $values: JSON!) {
              change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $values) {
                id
              }
            }
          `,
          {
            itemId: String(childMap[subItemName]),
            boardId,
            values: subValuesPayload
          }
        );
      } else {
        const data = await fetchWithRetry(
          token,
          `
            mutation ($parentId: ID!, $name: String!, $values: JSON!) {
              create_subitem(parent_item_id: $parentId, item_name: $name, column_values: $values) {
                id
              }
            }
          `,
          {
            parentId: String(parentId),
            name: subItemName,
            values: subValuesPayload
          }
        );
        const subItemId = data?.create_subitem?.id;
        if (subItemId) {
          childMap[subItemName] = subItemId;
        }
      }
    }
  }
};

const main = async () => {
  const token = process.env.MONDAY_TOKEN;

  console.log('Syncing Bookiji executive dashboard on Monday.com...');

  const board = await ensureBoard(token);
  const boardId = String(board.id);
  await describeBoard(token, boardId);
  const { columnMap, labelMaps } = await ensureColumns(token, boardId);
  await upsertItems(token, boardId, columnMap, labelMaps);

  console.log('Executive dashboard sync complete.');
};

main().catch((error) => {
  console.error('Failed to sync Monday executive dashboard:', error.message);
  process.exit(1);
});

