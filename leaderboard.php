<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$host = 'localhost';
$dbname = '';
$username = '';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die(json_encode(['success' => false, 'error' => 'Connection failed: ' . $e->getMessage()]));
}

$profanityList = ['fuck', 'shit', 'cunt', 'bitch', 'pussy', 'dick'];
function filterProfanity($text) {
    global $profanityList;
    return str_ireplace($profanityList, '****', $text);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT username, score, time FROM leaderboard ORDER BY score DESC, time ASC LIMIT 10");
        $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($leaderboard);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['username']) && isset($input['score']) && isset($input['time'])) {
        $username = filterProfanity(substr(trim($input['username']), 0, 20)); // Limit to 20 chars
        $score = intval($input['score']);
        $time = floatval($input['time']);
        
        try {
            $stmt = $pdo->prepare("SELECT score, time FROM leaderboard WHERE username = ?");
            $stmt->execute([$username]);
            $existingEntry = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingEntry) {
                if ($score > $existingEntry['score'] || ($score == $existingEntry['score'] && $time < $existingEntry['time'])) {
                    $updateStmt = $pdo->prepare("UPDATE leaderboard SET score = ?, time = ? WHERE username = ?");
                    $updateStmt->execute([$score, $time, $username]);
                    echo json_encode(['success' => true, 'message' => 'Score updated successfully']);
                } else {
                    echo json_encode(['success' => true, 'message' => 'Score not updated']);
                }
            } else {
                $insertStmt = $pdo->prepare("INSERT INTO leaderboard (username, score, time) VALUES (?, ?, ?)");
                $insertStmt->execute([$username, $score, $time]);
                echo json_encode(['success' => true, 'message' => 'New score added successfully']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid input']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}
?>