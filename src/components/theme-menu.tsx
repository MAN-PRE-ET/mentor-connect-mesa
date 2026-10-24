import { Contrast, Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setTextSize, setThemeMode, useTheme, type TextSize, type ThemeMode } from "@/lib/theme";

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "contrast", label: "High contrast", icon: Contrast },
  { value: "system", label: "System", icon: Monitor },
];

/** Icon menu for theme mode and text size; works on mobile. */
export function ThemeMenu({ className }: { className?: string }) {
  const { mode, textSize } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-lg ${className ?? ""}`}
          aria-label="Theme and text size settings"
        >
          <Palette className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-md:[&_[role=menuitemradio]]:min-h-11">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setThemeMode(value as ThemeMode)}
        >
          {THEMES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon /> {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Text size</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={textSize}
          onValueChange={(value) => setTextSize(value as TextSize)}
        >
          <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="large">Large</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
