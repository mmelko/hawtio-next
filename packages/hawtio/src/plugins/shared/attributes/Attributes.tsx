import { PluginNodeSelectionContext } from '@hawtiosrc/plugins/context'
import { AttributeValues } from '@hawtiosrc/plugins/shared/jolokia-service'
import { isObject } from '@hawtiosrc/util/objects'
import { Card, Drawer, DrawerContent, DrawerContentBody, PageSection } from '@patternfly/react-core'
import { TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { Response } from 'jolokia.js'
import React, { useContext, useEffect, useState } from 'react'
import { HawtioEmptyCard } from '../HawtioEmptyCard'
import { HawtioLoadingCard } from '../HawtioLoadingCard'
import { log } from '../globals'
import { AttributeModal } from './AttributeModal'
import { attributeService } from './attribute-service'

export const Attributes: React.FunctionComponent = () => {
  const { selectedNode } = useContext(PluginNodeSelectionContext)
  const [attributes, setAttributes] = useState<AttributeValues>({})
  const [isReading, setIsReading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState({ name: '', value: '' })
  const [reload, setReload] = useState(true)

  useEffect(() => {
    if (!selectedNode || !selectedNode.mbean || !selectedNode.objectName || !reload) {
      return
    }

    setIsReading(true)
    const objectName = selectedNode.objectName
    const readAttributes = async () => {
      const attrs = await attributeService.read(objectName)
      setAttributes(attrs)
      setIsReading(false)
    }
    readAttributes()

    setReload(false)
  }, [selectedNode, reload])

  useEffect(() => {
    if (!selectedNode || !selectedNode.mbean || !selectedNode.objectName) {
      return
    }

    const mbean = selectedNode.objectName
    attributeService.register({ type: 'read', mbean }, (response: Response) => {
      log.debug('Scheduler - Attributes:', response.value)
      setAttributes(response.value as AttributeValues)
    })

    return () => attributeService.unregisterAll()
  }, [selectedNode])

  if (!selectedNode || !selectedNode.mbean || !selectedNode.objectName) {
    return null
  }

  if (isReading) {
    return <HawtioLoadingCard />
  }

  const rows: { name: string; value: string }[] = Object.entries(attributes).map(([name, value]) => ({
    name: name,
    value: isObject(value) ? JSON.stringify(value) : String(value),
  }))

  if (rows.length === 0) {
    return <HawtioEmptyCard message='This MBean has no attributes.' />
  }

  const selectAttribute = (attribute: { name: string; value: string }) => {
    setSelected(attribute)
    if (!isModalOpen) {
      setIsModalOpen(true)
    }
  }

  const panelContent = (
    <AttributeModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onUpdate={() => setReload(true)}
      input={selected}
    />
  )

  const attributesTable = (
    <TableComposable aria-label='Attributes' variant='compact'>
      <Thead>
        <Tr>
          <Th>Attribute</Th>
          <Th>Value</Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((att, index) => (
          <Tr
            key={att.name + '-' + index}
            isHoverable
            isRowSelected={selected.name === att.name}
            onRowClick={() => selectAttribute(att)}
          >
            <Td>{att.name}</Td>
            <Td>{att.value}</Td>
          </Tr>
        ))}
      </Tbody>
    </TableComposable>
  )
  return (
    <React.Fragment>
      <Card>
        <Drawer isExpanded={isModalOpen} className={'pf-m-inline-on-2xl'}>
          <DrawerContent panelContent={panelContent}>
            <DrawerContentBody hasPadding> {attributesTable}</DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </Card>
    </React.Fragment>
  )
}
