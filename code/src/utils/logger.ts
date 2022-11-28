class Logger {
    private static loggerHTMLElement: HTMLElement = document.getElementById("log_output") as HTMLElement;

    public static writeLine(message: string) {
        const element = document.createElement("span");
        const stamp = new Date();
        const stampString = `${stamp.getHours()}:${("0" + stamp.getMinutes()).slice(-2)}:${("0" + stamp.getSeconds()).slice(-2)}.${("00" + stamp.getMilliseconds()).slice(-3)}`;

        element.innerHTML = `[${stampString}] ${message}`;

        Logger.loggerHTMLElement.appendChild(element);
        Logger.loggerHTMLElement.scrollTo(0, Logger.loggerHTMLElement.scrollHeight);
    }
}

export { Logger };