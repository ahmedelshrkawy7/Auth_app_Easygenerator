import { CheckIcon, XIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { passwordRules } from "../schemas"

export function PasswordChecklist({
  id,
  password,
}: {
  id: string
  password: string
}) {
  return (
    <ul
      id={id}
      aria-label="Password requirements"
      className="grid gap-1 text-sm"
    >
      {passwordRules.map((rule) => {
        const met = rule.test(password)
        const Icon = met ? CheckIcon : XIcon
        return (
          <li
            key={rule.id}
            data-met={met}
            className={cn(
              "flex items-center gap-2 transition-colors",
              met
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span>{rule.label}</span>
            <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
          </li>
        )
      })}
    </ul>
  )
}
