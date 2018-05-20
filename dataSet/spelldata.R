
library(readxl)
Cloud_Spell_data <- 
  read_excel("Desktop/info3300_dataV/3300_final_group/Cloud_Spell_data.xlsx", 
             +sheet = "Cloud_Spell_data")

library(tidyverse)
spell<- Cloud_Spell_data %>%
  select(`Number of Records`,`Spell`) %>%
  group_by(`Spell`) %>%
  summarise(count = n())

write.csv(spell, file="spell_sum.csv",
          row.names=FALSE)
