#!/usr/bin/env python3

import json
import tkinter as tk
from tkinter import ttk, filedialog

IDs = set()
planets = dict()
lanes = dict()
graph = dict()

def coord_validate(val):
	if val == "" or val == "-":
		return True
	try:
		float(val)
		return True
	except:
		return False

class AddPlanetDialog(tk.Toplevel):
	def __init__(self, parent, planet=""):
		super().__init__(parent)
		if(len(planet) > 0):
			self.title("Edit Planet")
		else:
			self.title("Add Planet")
		self.geometry("300x150")
		
		self.transient(parent)
		self.grab_set()
		
		self.ready = tk.BooleanVar(value=False)
		self.result = None
		
		coordValidate = (self.register(coord_validate), '%P')
		
		main_frame = ttk.Frame(self, padding="10")
		main_frame.pack(fill="both", expand=True)
		
		ttk.Label(main_frame, text="Name:").grid(row=0, column=0, sticky="w", pady=5)
		self.name_entry = ttk.Entry(main_frame)
		self.name_entry.grid(row=0, column=1, sticky="ew", pady=5)
		
		ttk.Label(main_frame, text="X:").grid(row=1, column=0, sticky="w", pady=5)
		self.x_entry = ttk.Entry(main_frame, validate='key', validatecommand=coordValidate)
		self.x_entry.grid(row=1, column=1, sticky="ew", pady=5)
		ttk.Label(main_frame, text="Y:").grid(row=2, column=0, sticky="w", pady=5)
		self.y_entry = ttk.Entry(main_frame, validate='key', validatecommand=coordValidate)
		self.y_entry.grid(row=2, column=1, sticky="ew", pady=5)
		
		btn_frame = ttk.Frame(main_frame)
		btn_frame.grid(row=3, column=0, columnspan=2, pady=20)
		
		ttk.Button(btn_frame, text="Save", command=self.save_planet).pack(side="left", padx=5)
		ttk.Button(btn_frame, text="Cancel", command=self.cancel_planet).pack(side="left", padx=5)
		
		self.wait_variable(self.ready)
		self.destroy()
		
	def save_planet(self):
		self.ready.set(True)
		
	def cancel_planet(self):
		self.ready.set(True)
		
def add_planet(planet=""):
	dialog = AddPlanetDialog(root, planet)

class MapApp:
    def __init__(self, root):
        self.root = root
        self.root.title("SWMap Editor")
        self.root.geometry("600x400")

        # Create the Tab Control (Notebook)
        self.tab_control = ttk.Notebook(self.root)

        # Initialize individual tabs
        self.planets = ttk.Frame(self.tab_control)
        self.lanes = ttk.Frame(self.tab_control)
        self.data = ttk.Frame(self.tab_control)

        # Add tabs to the notebook
        self.tab_control.add(self.planets, text='Planets')
        self.tab_control.add(self.lanes, text='Lanes')
        self.tab_control.add(self.data, text='Import/Export')
        
        # Pack the notebook so it fills the window
        self.tab_control.pack(expand=1, fill="both")

        self.setup_planets()
        self.setup_lanes()

    def setup_planets(self):
		paned_window = ttk.PanedWindow(self.planets, orient="horizontal")
		paned_window.pack(fill="both", expand=True, padx=10, pady=10)
		
		list_frame = ttk.Frame(paned_window)
		paned_window.add(list_frame, weight=1)
		
        ttk.Label(list_frame, text="Planet List").pack(anchor="w")
        self.planet_listbox = tk.Listbox(list_frame)
        self.planet_listbox.pack(fill="both", expand=True, pady=5)
        
        btn_add = ttk.Button(self.planets, text="Add Planet", command=add_planet)
        btn_add.pack(pady=10)

    def setup_lanes(self):
        """Add widgets to the second tab."""
        label = ttk.Label(self.lanes, text="Configuration Settings")
        label.pack(pady=10)
        
        check = ttk.Checkbutton(self.lanes, text="Enable Notifications")
        check.pack(pady=5)

if __name__ == '__main__':
	root = tk.Tk()
	app = MapApp(root)
	root.mainloop()
