enum TargetCategory {
    //% block="任何物件"
    All = 0,
    //% block="人 (person)"
    Person = 1,
    //% block="貓 (cat)"
    Cat = 2,
    //% block="狗 (dog)"
    Dog = 3,
    //% block="車子 (car)"
    Car = 4,
    //% block="蘋果 (apple)"
    Apple = 5,
    //% block="杯子 (cup)"
    Cup = 6,
    //% block="瓶子 (bottle)"
    Bottle = 7,
    //% block="椅子 (chair)"
    Chair = 8,
    //% block="手機 (cell phone)"
    CellPhone = 9
}

//% weight=100 color=#0fbc11 icon="" block="iPad 控制"
namespace iPadConnect {
    let latestX = 0;
    let latestY = 0;
    let isConnected = false;

    function getCategoryString(category: TargetCategory): string {
        switch (category) {
            case TargetCategory.All: return "all";
            case TargetCategory.Person: return "person";
            case TargetCategory.Cat: return "cat";
            case TargetCategory.Dog: return "dog";
            case TargetCategory.Car: return "car";
            case TargetCategory.Apple: return "apple";
            case TargetCategory.Cup: return "cup";
            case TargetCategory.Bottle: return "bottle";
            case TargetCategory.Chair: return "chair";
            case TargetCategory.CellPhone: return "cell phone";
            default: return "all";
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
            let receivedString = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine));

            // 檢查是否包含逗號 (處理座標格式 X,Y)
            let commaIndex = receivedString.indexOf(",");
            if (commaIndex > 0) {
                let xStr = receivedString.substr(0, commaIndex);
                let yStr = receivedString.substr(commaIndex + 1);
                latestX = parseFloat(xStr);
                latestY = parseFloat(yStr);

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
    //% blockId=ipad_get_x block="取得最新 X 座標"
    //% weight=70
    export function getX(): number {
        return latestX;
    }

    /**
     * 取得最新收到的 Y 座標
     */
    //% blockId=ipad_get_y block="取得最新 Y 座標"
    //% weight=60
    export function getY(): number {
        return latestY;
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
