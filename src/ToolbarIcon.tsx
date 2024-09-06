import React, { useEffect, useRef } from 'react';
import { setIcon, Menu } from 'obsidian';

interface MenuItem {
    title: string;
    onClick: () => void;
}

interface ToolbarIconProps {
    icon: string;
    tooltip: string;
    onClick?: () => void;
    menu?: MenuItem[];
}

const ToolbarIcon: React.FC<ToolbarIconProps> = ({ icon, tooltip, onClick, menu }) => {
    const iconRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (iconRef.current) {
            setIcon(iconRef.current, icon);
        }
    }, [icon]);

    const handleClick = (event: React.MouseEvent) => {
        if (menu) {
            const obsidianMenu = new Menu();
            menu.forEach(item => {
                obsidianMenu.addItem((menuItem) => 
                    menuItem.setTitle(item.title).onClick(item.onClick)
                );
            });
            obsidianMenu.showAtMouseEvent(event.nativeEvent as MouseEvent);
        } else if (onClick) {
            onClick();
        }
    };

    return (
        <div 
            ref={iconRef}
            className="nav-action-button"
            aria-label={tooltip}
            onClick={handleClick}
        />
    );
};

export default ToolbarIcon;