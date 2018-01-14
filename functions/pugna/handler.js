'use strict';

const printDebug = process.env.PRINT_DEBUG === 'true';

const debug = (message) => {
    if (printDebug) console.log(message);
};

module.exports.ping = (event, context, callback) => {
    const response = {
        statusCode: 200,
        body: 'pong'
    };
    callback(null, response);
};

const findInPositions =
    (positions) =>
        (x, y) => {
            const position = {
                coordinate: {x: x, y: y}
            };
            const inBoard = positions.find((point) => point.coordinate.x === x && point.coordinate.y === y);
            if (inBoard) {
                position.playerName = inBoard.playerName;
            }

            return position;
        };

const surroundingPoints = (positions, point) => {
            const findPoint = findInPositions(positions);
            return [
                {
                    move: "UP_LEFT",
                    score: 0,
                    point: findPoint(point.coordinate.x - 1, point.coordinate.y + 1)
                },
                {
                    move: "UP",
                    score: 0,
                    point: findPoint(point.coordinate.x, point.coordinate.y + 1)
                },
                {
                    move: "UP_RIGHT",
                    score: 0,
                    point: findPoint(point.coordinate.x + 1, point.coordinate.y + 1)
                },
                {
                    move: "LEFT",
                    score: 0,
                    point: findPoint(point.coordinate.x - 1, point.coordinate.y)
                },
                {
                    move: "RIGHT",
                    score: 0,
                    point: findPoint(point.coordinate.x + 1, point.coordinate.y)
                },
                {
                    move: "DOWN_LEFT",
                    score: 0,
                    point: findPoint(point.coordinate.x - 1, point.coordinate.y - 1)
                },
                {
                    move: "DOWN",
                    score: 0,
                    point: findPoint(point.coordinate.x, point.coordinate.y - 1)
                },
                {
                    move: "DOWN_RIGHT",
                    score: 0,
                    point: findPoint(point.coordinate.x + 1, point.coordinate.y - 1)
                }
            ];
        };

const distanceToPoint = (a, b) => Math.sqrt(Math.pow(a.coordinate.x - b.coordinate.x, 2) +
    Math.pow(a.coordinate.y - b.coordinate.y, 2));

const findClosest = (positions, targetPlayer) => (target) => positions
    .filter((p) => p.playerName === targetPlayer)
    .sort((a, b) =>
        distanceToPoint(target, a) - distanceToPoint(target, b)
    )[0];

// const findClosestOpponent = (positions, targetPlayer) => (target) => positions
//     .filter((p) => p.playerName === targetPlayer)[0];

const checkSafeMove = (positions) => (playerName) => (p) => {
    const captureSurrounds = surroundingPoints(positions, p.point);
    return !captureSurrounds.some(c => c.point.playerName && (c.point.playerName !== playerName));
};

const determineNextMove = (positions, target, targetPlayer, boardSize) => {
    if (!positions.some((p) => p.playerName !== target.playerName)) {
        debug('We already won!');
        return 'STAY';
    }

    const safe = checkSafeMove(positions)(target.playerName);

    const eligiblePoints = surroundingPoints(positions, target)
        .filter(p => p.point.coordinate.x > -1
            && p.point.coordinate.x < boardSize
            && p.point.coordinate.y > -1
            && p.point.coordinate.y < boardSize);

    debug('Eligible moves: ' + JSON.stringify(eligiblePoints));
    const possibleCaptures = eligiblePoints
        .filter(p => p.point.playerName && (p.point.playerName !== target.playerName));
    const safeCaptures = possibleCaptures.filter(safe);

    const openPoints = eligiblePoints
        .filter(p => !p.point.playerName);

    const findClosestOpponent = findClosest(positions, targetPlayer);

    const findClosestFriend = findClosest(positions, target.playerName);

    const backup = eligiblePoints.filter(p => p.point.playerName === target.playerName).length;

    const safeOpenPoints = openPoints
        .filter(safe)
        .map(p => {
            const closestOpponent = findClosestOpponent(target);
            const closestFriend = findClosestFriend(target);
            debug(JSON.stringify(closestOpponent));
            return [p, backup > 1 ? distanceToPoint(closestOpponent, p.point): distanceToPoint(closestFriend, p.point)];
            // return [p, distanceToPoint(closestOpponent, p.point)];
        })
        .sort((a, b) => a[1] - b[1])
        .map(pd => pd[0]);

    if (possibleCaptures.length) {
        debug('Unsafe captures: ' + JSON.stringify(possibleCaptures));
        return possibleCaptures[0].move;
    }

    if (backup > 1) {
        if (openPoints.length) {
            debug('Unsafe open points: ' + JSON.stringify(openPoints));
            return openPoints[0].move;
        }
    } else {

        // if (safeCaptures.length) {
        //     debug('Safe captures: ' + JSON.stringify(safeCaptures));
        //     return safeCaptures[0].move;
        // }
        //
        if (safeOpenPoints.length) {
            debug('Safe open points: ' + JSON.stringify(safeOpenPoints));
            return safeOpenPoints[0].move;
        }
    }

    debug('Doing nothing');

    return 'STAY';
};

module.exports.nextMove = (event, context, callback) => {
    debug(event.body);

    const game = JSON.parse(event.body);

    const target = game.positionToMove;

    const positions = game.boardState.positions;

    const boardSize = game.boardState.boardSize;

    const targetPlayer = game.boardState.players
        .filter(p => p !== target.playerName
            && positions.some(q => q.playerName === p))
        .map(p => [p, positions.filter(q => q.playerName === p).length])
        .sort((a, b) => a[1] - b[1])[0][0];

    debug('Point to move: ' + JSON.stringify(target));

    debug('Board state: ' + JSON.stringify(positions));

    debug('Targeting player: ' + targetPlayer);

    const response = {
        statusCode: 200,
        body: determineNextMove(positions, target, targetPlayer, boardSize)
    };

    callback(null, response);
};
