import React, { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Modal,
  TextField,
  Button,
  Typography,
} from "@mui/material";
import { getDatabase, ref, get, update } from "firebase/database";

const Sectores = () => {
  const db = getDatabase();
  const [sectores, setSectores] = useState([]);
  const [selectedSetor, setSelectedSetor] = useState(null);
  const [newSubsector, setNewSubsector] = useState("");
  const [openModal, setOpenModal] = useState(false);

  // Buscar setores do Firebase
  useEffect(() => {
    const fetchSectores = async () => {
      const dbRef = ref(db, "sectores_de_atividade");
      try {
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          setSectores(snapshot.val());
        } else {
          console.log("Nenhum setor encontrado.");
        }
      } catch (error) {
        console.error("Erro ao buscar setores: ", error);
      }
    };
    fetchSectores();
  }, [db]);

  // Abrir modal com subsectores
  const handleOpenModal = (setor) => {
    setSelectedSetor(setor);
    setOpenModal(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setOpenModal(false);
    setNewSubsector("");
  };

  // Adicionar novo subsector
  const handleAddSubsector = async () => {
    if (!newSubsector.trim()) return; // Evitar adicionar subsector vazio

    try {
      const updatedSubsectores = [...selectedSetor.subsectores, newSubsector];
      const setorRef = ref(db, `sectores_de_atividade/${selectedSetor.setor}`);
      await update(setorRef, { subsectores: updatedSubsectores });

      // Atualizar estado local
      setSectores((prev) =>
        prev.map((setor) =>
          setor.setor === selectedSetor.setor
            ? { ...setor, subsectores: updatedSubsectores }
            : setor
        )
      );

      setNewSubsector(""); // Limpar campo de texto
    } catch (error) {
      console.error("Erro ao adicionar subsector: ", error);
    }
  };

  return (
    <Box className="p-8 bg-gray-50 min-h-screen">
      <Typography variant="h4" gutterBottom>
        Setores de Atividade
      </Typography>
      <List>
        {sectores.map((setor, index) => (
          <ListItem
            key={index}
            button
            onClick={() => handleOpenModal(setor)}
            sx={{
              backgroundColor: "#f5f5f5",
              marginBottom: "8px",
              borderRadius: "4px",
              "&:hover": { backgroundColor: "#e0e0e0" },
            }}
          >
            <ListItemText primary={setor.setor} />
          </ListItem>
        ))}
      </List>

      {/* Modal para subsectores */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: "8px",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Subsectores de {selectedSetor?.setor}
          </Typography>
          <List>
            {selectedSetor?.subsectores.map((subsector, index) => (
              <ListItem key={index}>
                <ListItemText primary={subsector} />
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Novo Subsector"
              value={newSubsector}
              onChange={(e) => setNewSubsector(e.target.value)}
            />
            <Button variant="contained" onClick={handleAddSubsector}>
              Adicionar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default Sectores;