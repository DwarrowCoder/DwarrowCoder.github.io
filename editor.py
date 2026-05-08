#!/usr/bin/env python3

import json
import tkinter as tk
from tkinter import ttk

planetNames = set()
laneNames = set()
planetIDs = set()
laneIDs = set()
planets = list()
lanes = list()
graph = dict()

class MapApp:
    def __init__(self, root):
        self.root = root
        self.root.title("SWMap Editor")
        self.root.geometry("600x400")

        # Create the Tab Control (Notebook)
        self.tab_control = ttk.Notebook(self.root)

        # Initialize individual tabs
        self.tab1 = ttk.Frame(self.tab_control)
        self.tab2 = ttk.Frame(self.tab_control)
        self.tab3 = ttk.Frame(self.tab_control)

        # Add tabs to the notebook
        self.tab_control.add(self.tab1, text='Home')
        self.tab_control.add(self.tab2, text='Settings')
        self.tab_control.add(self.tab3, text='Help')
        
        # Pack the notebook so it fills the window
        self.tab_control.pack(expand=1, fill="both")

        self.setup_tab1()
        self.setup_tab2()

    def setup_tab1(self):
        """Add widgets to the first tab."""
        label = ttk.Label(self.tab1, text="Welcome to the Home Tab!", font=("Arial", 14))
        label.pack(pady=20, padx=20)
        
        btn = ttk.Button(self.tab1, text="Click Me", command=lambda: print("Button pressed!"))
        btn.pack(pady=10)

    def setup_tab2(self):
        """Add widgets to the second tab."""
        label = ttk.Label(self.tab2, text="Configuration Settings")
        label.pack(pady=10)
        
        check = ttk.Checkbutton(self.tab2, text="Enable Notifications")
        check.pack(pady=5)

if __name__ == '__main__':
	root = tk.Tk()
	app = MapApp(root)
	root.mainloop()
