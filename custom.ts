enum TargetCategory {
    //% block="任何物件"
    All = -1,
    //% block="人 (person)"
    Person = 0,
    //% block="貓 (cat)"
    Cat = 15,
    //% block="狗 (dog)"
    Dog = 16,
    //% block="車子 (car)"
    Car = 2,
    //% block="蘋果 (apple)"
    Apple = 47,
    //% block="杯子 (cup)"
    Cup = 41,
    //% block="瓶子 (bottle)"
    Bottle = 39,
    //% block="椅子 (chair)"
    Chair = 56,
    //% block="手機 (cell phone)"
    CellPhone = 67
}

//% weight=100 color=#0fbc11 icon="" block="iPad 控制"
namespace iPadConnect {
    let latestX = 0;
    let latestY = 0;
    let latestW = 0;
    let latestH = 0;
    let isConnected = false;

    function getCategoryString(category: TargetCategory): string {
        switch (category) {
            case TargetCategory.All: return "all";
            default:
                // 將 Enum 的數值直接轉成字串傳送 (例如傳送 "0", "1", "47")
                // 注意：在 TargetCategory 中，Apple 目前被設定為 5。
                // 如果要對應 YOLOv8 原生 Index，可能需要修改 enum 對應的數值。
                return category.toString();
        }
    }

    /**
     * 初始化 iPad 藍牙連線 (必須放在「當啟動時」)
     */
    //% blockId=ipad_init block="初始化 iPad 藍牙連線"
    //% weight=100
    export function init() {
        bluetooth.startUartService();

        bluetooth.onBluetoothConnected(function () {
            isConnected = true;
            basic.showIcon(IconNames.Yes);
        });

        bluetooth.onBluetoothDisconnected(function () {
            isConnected = false;
            basic.showIcon(IconNames.No);
        });

        // 隱藏藍牙接收的複雜度，並防止學生在這裡放 pause()
        bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            let rawString = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine));
            let receivedString = rawString.trim();

            // 【除錯用】把收到的原始字串印到序列埠
            serial.writeLine("RX: " + receivedString);

            // 檢查是否包含逗號 (處理座標格式 X,Y,W,H 或 X,Y)
            let commaIndex = receivedString.indexOf(",");
            if (commaIndex > 0) {
                let p1 = receivedString.indexOf(",");
                let p2 = receivedString.indexOf(",", p1 + 1);
                let p3 = receivedString.indexOf(",", p2 + 1);

                if (p2 > 0 && p3 > 0) {
                    // X,Y,W,H
                    latestX = parseFloat(receivedString.substr(0, p1));
                    latestY = parseFloat(receivedString.substr(p1 + 1, p2 - p1 - 1));
                    latestW = parseFloat(receivedString.substr(p2 + 1, p3 - p2 - 1));
                    latestH = parseFloat(receivedString.substr(p3 + 1));
                } else if (p1 > 0) {
                    // 舊版只有 X,Y
                    latestX = parseFloat(receivedString.substr(0, p1));
                    latestY = parseFloat(receivedString.substr(p1 + 1));
                    latestW = 0;
                    latestH = 0;
                }

                // 觸發自訂的座標事件
                control.raiseEvent(31415, 1);
            } else {
                // 如果沒有逗號，當作一般文字指令處理
                // 將收到的文字儲存，並觸發指令事件
                latestCommand = receivedString.trim();
                control.raiseEvent(31415, 2);
            }
        });
    }

    let latestCommand = "";

    /**
     * 當收到 iPad 傳來的座標資料時執行
     */
    //% blockId=ipad_on_data block="當收到 iPad 座標資料"
    //% weight=90
    export function onDataReceived(body: () => void): void {
        control.onEvent(31415, 1, body);
    }

    /**
     * 設定 iPad 上的 AI 追蹤目標
     * @param category 欲追蹤的目標類別
     */
    //% blockId=ipad_set_target block="設定追蹤目標為 %category"
    //% weight=85
    export function setTrackingTarget(category: TargetCategory) {
        let catStr = getCategoryString(category);
        sendToiPad("TARGET:" + catStr);
    }

    /**
     * 當收到 iPad 傳來的文字指令時執行
     */
    //% blockId=ipad_on_command block="當收到 iPad 文字指令"
    //% weight=80
    export function onCommandReceived(body: () => void): void {
        control.onEvent(31415, 2, body);
    }

    /**
     * 取得最新收到的 X 座標
     */
    //% blockId=ipad_get_x block="取得最新 X 座標 (0~100%)"
    //% weight=70
    export function getX(): number {
        return latestX;
    }

    /**
     * 取得最新收到的 Y 座標
     */
    //% blockId=ipad_get_y block="取得最新 Y 座標 (0~100%)"
    //% weight=60
    export function getY(): number {
        return latestY;
    }

    /**
     * 取得最新收到的物件寬度 (Width)
     */
    //% blockId=ipad_get_w block="取得最新寬度 (0~100%)"
    //% weight=58
    export function getW(): number {
        return latestW;
    }

    /**
     * 取得最新收到的物件高度 (Height)
     */
    //% blockId=ipad_get_h block="取得最新高度 (0~100%)"
    //% weight=57
    export function getH(): number {
        return latestH;
    }

    /**
     * 取得最新收到的文字指令 (例如 START, STOP, END)
     */
    //% blockId=ipad_get_cmd block="取得最新指令"
    //% weight=55
    export function getCommand(): string {
        return latestCommand;
    }

    /**
     * 傳送訊息給 iPad
     * @param msg 要傳送的文字訊息, eg: "HELLO"
     */
    //% blockId=ipad_send block="傳送文字 %msg 給 iPad"
    //% weight=50
    export function sendToiPad(msg: string) {
        bluetooth.uartWriteString(msg + "\n");
    }

}
