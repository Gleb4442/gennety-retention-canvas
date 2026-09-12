#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo "  Retention Canvas"
echo "  Запуск локального веб-сервера..."
echo "============================================================"

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "Node.js не найден в PATH. Попытка загрузить NVM/Homebrew..."
    export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
fi

# Open browser and run Vite
npx vite --open
