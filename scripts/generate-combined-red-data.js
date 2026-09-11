const fs = require('fs');
const path = require('path');

const dataDirectory = path.join(__dirname, '..', 'app', 'images', 'data');
const combinedRed = '1-RED (COMBINED)';
const redPriorities = new Set(['1-RED (ACP)', '2-RED (PCP)']);
const excludedPriorities = new Set(['CODE 2', 'COURTESY CODE 2']);

function isCode2(value) {
    return /(?:^|\b)(?:courtesy\s+)?code\s*2(?:$|\b)/i.test(String(value || ''));
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        const next = text[index + 1];
        if (character === '"' && quoted && next === '"') {
            value += '"';
            index += 1;
        } else if (character === '"') {
            quoted = !quoted;
        } else if (character === ',' && !quoted) {
            row.push(value);
            value = '';
        } else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && next === '\n') index += 1;
            row.push(value);
            if (row.some(Boolean)) rows.push(row);
            row = [];
            value = '';
        } else {
            value += character;
        }
    }
    if (value || row.length) {
        row.push(value);
        rows.push(row);
    }
    const headers = rows.shift();
    return { headers, rows: rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))) };
}

function escapeCsv(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filename, headers, rows) {
    const output = [headers.join(',')].concat(rows.map(row => headers.map(header => escapeCsv(row[header])).join(','))).join('\n') + '\n';
    fs.writeFileSync(path.join(dataDirectory, filename), output);
}

function read(filename) {
    return parseCsv(fs.readFileSync(path.join(dataDirectory, filename), 'utf8'));
}

function combineBeeswarm() {
    const source = read('priority_response_beeswarm_by_priority_time.csv');
    const groups = new Map();
    source.rows.forEach(row => {
        const priority = redPriorities.has(row['Final Priority']) ? combinedRed : row['Final Priority'];
        const key = `${priority}|${row['Response Time (sec)']}`;
        const current = groups.get(key) || { 'Final Priority': priority, 'Response Time (sec)': row['Response Time (sec)'], Count: 0 };
        current.Count += Number(row.Count);
        groups.set(key, current);
    });
    const order = ['0-PURPLE', combinedRed, '3-ORANGE', '4-YELLOW'];
    const rows = Array.from(groups.values()).sort((a, b) => order.indexOf(a['Final Priority']) - order.indexOf(b['Final Priority']) || Number(a['Response Time (sec)']) - Number(b['Response Time (sec)']));
    writeCsv('priority_response_beeswarm_by_priority_time_combinedRed.csv', source.headers, rows);
}

function combineSlowResponses() {
    const source = read('slow_response_by_priority.csv');
    const analysisPath = path.join(dataDirectory, '..', '..', 'tor-ems-responses-data-and-dashboard', 'output', 'toronto_analysis_dataset.csv');
    const unchanged = new Map();
    if (fs.existsSync(analysisPath)) {
        parseCsv(fs.readFileSync(analysisPath, 'utf8')).rows.forEach(row => {
            if (row.use !== 'Y' || row.analysis_exclusion_reason || row.priority_direction !== 'Unchanged' || !['Y', 'N'].includes(row.slow_response)) return;
            const priority = redPriorities.has(row.final_priority) ? combinedRed : row.final_priority;
            if (!['0-PURPLE', combinedRed, '3-ORANGE', '4-YELLOW'].includes(priority)) return;
            const values = unchanged.get(priority) || { total: 0, slow: 0 };
            values.total += 1;
            if (row.slow_response === 'Y') values.slow += 1;
            unchanged.set(priority, values);
        });
    }
    const redRows = source.rows.filter(row => redPriorities.has(row['Final Priority']));
    const total = redRows.reduce((sum, row) => sum + Number(row.Total), 0);
    const slow = redRows.reduce((sum, row) => sum + Number(row.Slow), 0);
    const onTime = redRows.reduce((sum, row) => sum + Number(row['On Time']), 0);
    const red = {
        'Final Priority': combinedRed,
        Total: total,
        Slow: slow,
        'On Time': onTime,
        'Slow Rate (%)': (slow / total * 100).toFixed(1),
        'Threshold Applied': '539s (08:59)'
    };
    const rows = source.rows.filter(row => !redPriorities.has(row['Final Priority']));
    rows.splice(1, 0, red);
    rows.forEach(row => {
        const values = unchanged.get(row['Final Priority']) || { total: 0, slow: 0 };
        row['Unchanged Total'] = values.total;
        row['Unchanged Slow'] = values.slow;
        row['Unchanged Slow Rate (%)'] = values.total ? (values.slow / values.total * 100).toFixed(1) : '';
    });
    writeCsv('slow_response_by_priority_combinedRed.csv', source.headers.concat(['Unchanged Total', 'Unchanged Slow', 'Unchanged Slow Rate (%)']), rows);
}

function combineMonthlyTrends() {
    const source = read('response_time_trend_by_priority.csv');
    const output = source.rows.filter(row => !redPriorities.has(row['Final Priority']) && !excludedPriorities.has(row['Final Priority']));
    const months = Array.from(new Set(source.rows.map(row => row['Year-Month'])));
    months.forEach(month => {
        const redRows = source.rows.filter(row => row['Year-Month'] === month && redPriorities.has(row['Final Priority']));
        const count = redRows.reduce((sum, row) => sum + Number(row.Count), 0);
        const weightedMean = redRows.reduce((sum, row) => sum + Number(row.Count) * Number(row['Mean (sec)']), 0) / count;
        output.push({
            'Year-Month': month,
            'Final Priority': combinedRed,
            Count: count,
            'Mean (sec)': weightedMean.toFixed(1),
            'Median (sec)': '',
            'P90 (sec)': ''
        });
    });
    const order = ['0-PURPLE', combinedRed, '3-ORANGE', '4-YELLOW'];
    output.sort((a, b) => a['Year-Month'].localeCompare(b['Year-Month']) || order.indexOf(a['Final Priority']) - order.indexOf(b['Final Priority']));
    writeCsv('response_time_trend_by_priority_combinedRed.csv', source.headers, output);
}

function combineMultiHour() {
    const source = read('multi_hour_calls.csv');
    const headers = ['Threshold', '0-PURPLE', combinedRed, '3-ORANGE', '4-YELLOW', 'Total'];
    const rows = source.rows.map(row => ({
        Threshold: row.Threshold,
        '0-PURPLE': row['0-PURPLE'],
        [combinedRed]: Number(row['1-RED (ACP)']) + Number(row['2-RED (PCP)']),
        '3-ORANGE': row['3-ORANGE'],
        '4-YELLOW': row['4-YELLOW'],
        Total: row.Total
    }));
    writeCsv('multi_hour_calls_combinedRed.csv', headers, rows);
}

function combineProblemPriorities() {
    const source = read('response_time_by_problem_and_priority.csv');
    const rows = source.rows.filter(row => (
        !redPriorities.has(row['Final Priority'])
        && !excludedPriorities.has(row['Final Priority'])
        && !isCode2(row['Problem (Short)'])
    )).map(row => {
        if (row['Final Priority'] === 'Combined red calls') row['Final Priority'] = combinedRed;
        return row;
    });
    writeCsv('response_time_by_problem_and_priority_combinedRed.csv', source.headers, rows);
}

combineBeeswarm();
combineSlowResponses();
combineMonthlyTrends();
combineMultiHour();
combineProblemPriorities();
